#!/usr/bin/env python3
"""Salomon Phase 3 M1 — offline local ask (spawn-per-request).

Product: GGUF via llama-cpp-python. CI/dev: transformers --offline.
Lead: spawn per ask; --json for LocalCompleter / POST /api/ask.

Exit codes:
  0  ok
  2  input_refused (secret scrub / bad input)
  3  local_model_unavailable (missing GGUF / HF cache miss)
  4  completion_failed

Env: SALOMON_GGUF, SALOMON_GGUF_DIR, SALOMON_OFFLINE=1, SALOMON_LLAMA_BACKEND=python
Prompt file: phase1-slm/configs/source_care_system.txt (Runtime must load same path; no fork).
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))
from secret_scan import scan_text, SAFETY_MSG

ROOT = Path(__file__).resolve().parents[1]
REPO = Path(__file__).resolve().parents[2]
DEFAULT_GGUF_DIR = ROOT / "models" / "gguf"
PROMPT_FILE = ROOT / "configs" / "source_care_system.txt"
MANIFEST_CANDIDATES = [
    REPO / "phase3-runtime" / "artifacts" / "MANIFEST.json",
    REPO / "phase3-runtime" / "artifacts" / "MANIFEST.example.json",
]
PRODUCT_GGUF_NAME = "salomon-qwen25-7b-instruct-Q4_K_M.gguf"
PRODUCT_GGUF_SHA256 = "65b8fcd92af6b4fefa935c625d1ac27ea29dcb6ee14589c55a8f115ceaaa1423"

EXIT_OK = 0
EXIT_INPUT = 2
EXIT_UNAVAILABLE = 3
EXIT_FAILED = 4


def load_system_prompt(override: str | None) -> str:
    if override is not None:
        return override
    if not PROMPT_FILE.is_file():
        emit_err("completion_failed", f"source-care prompt missing: {PROMPT_FILE}", EXIT_FAILED)
    return PROMPT_FILE.read_text(encoding="utf-8").strip()


def _offline_default() -> bool:
    v = os.environ.get("SALOMON_OFFLINE", "1").strip().lower()
    return v not in ("0", "false", "no", "off")


def read_manifest_filename() -> str | None:
    for p in MANIFEST_CANDIDATES:
        if not p.is_file():
            continue
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
            name = (data.get("artifact") or {}).get("filename")
            if name:
                return name
        except (OSError, json.JSONDecodeError):
            continue
    return None


def emit_json(obj: dict, code: int) -> None:
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()
    raise SystemExit(code)


def emit_err(reason: str, message: str, code: int, mode: str | None = None, model: str | None = None) -> None:
    body = {"ok": False, "reason": reason, "message": message, "answer": None, "refuse_reason": reason}
    if mode:
        body["mode"] = mode
    if model:
        body["model"] = model
    if os.environ.get("_ASK_LOCAL_JSON") == "1" or "--json" in sys.argv:
        emit_json(body, code)
    print(message, file=sys.stderr)
    raise SystemExit(code)


def resolve_gguf(explicit: str | None) -> Path:
    prefer = read_manifest_filename() or PRODUCT_GGUF_NAME
    if explicit:
        p = Path(explicit).expanduser().resolve()
        if "-of-" in p.name:
            emit_err("local_model_unavailable",
                     "Split GGUF shard refused — need single-file salomon-…-Q4_K_M.gguf (run fetch).",
                     EXIT_UNAVAILABLE, mode="gguf")
        if not p.is_file():
            emit_err("local_model_unavailable",
                     f"GGUF not found: {p}. Set SALOMON_GGUF or run fetch_gguf.sh.",
                     EXIT_UNAVAILABLE, mode="gguf")
        return p
    env_file = os.environ.get("SALOMON_GGUF", "").strip()
    if env_file:
        return resolve_gguf(env_file)
    dirs: list[Path] = []
    env_dir = os.environ.get("SALOMON_GGUF_DIR", "").strip()
    if env_dir:
        dirs.append(Path(env_dir).expanduser().resolve())
    dirs.append((REPO / "phase3-runtime" / "artifacts").resolve())
    dirs.append(DEFAULT_GGUF_DIR.resolve())
    # Prefer exact MANIFEST / product name
    for d in dirs:
        cand = d / prefer
        if cand.is_file() and "-of-" not in cand.name:
            return cand
    matches: list[Path] = []
    for d in dirs:
        if not d.is_dir():
            continue
        for pat in ("*Q4_K_M*.gguf", "*q4_k_m*.gguf"):
            for m in d.glob(pat):
                if "-of-" in m.name:
                    continue
                matches.append(m.resolve())
        if matches:
            break
    uniq = sorted(set(matches))
    if len(uniq) == 1:
        return uniq[0]
    if len(uniq) > 1:
        listed = ", ".join(u.name for u in uniq)
        emit_err("local_model_unavailable",
                 f"Multiple Q4_K_M GGUFs ({listed}). Set SALOMON_GGUF to {prefer}.",
                 EXIT_UNAVAILABLE, mode="gguf")
    emit_err("local_model_unavailable",
             "The local model isn't installed on this device (need single-file "
             f"{prefer}). Run phase3-runtime/scripts/fetch_gguf.sh or set SALOMON_GGUF. "
             "Nothing was sent anywhere.",
             EXIT_UNAVAILABLE, mode="gguf")
    raise AssertionError("unreachable")


def status_line(gguf: Path | None, backend: str, model: str | None) -> None:
    if gguf:
        try:
            sz = gguf.stat().st_size
        except OSError:
            sz = 0
        print(f"[ask_local] backend={backend} gguf={gguf.name} size_bytes={sz}", file=sys.stderr)
    else:
        print(f"[ask_local] backend={backend} model={model}", file=sys.stderr)


def generate_gguf(gguf: Path, system: str, user_text: str, max_new: int, temp: float) -> str:
    try:
        from llama_cpp import Llama
    except ImportError:
        emit_err("local_model_unavailable",
                 "llama-cpp-python not installed (pip install -r requirements-local.txt / prebuilt wheel).",
                 EXIT_UNAVAILABLE, mode="gguf")
    try:
        llm = Llama(model_path=str(gguf), n_ctx=4096, verbose=False)
        out = llm.create_chat_completion(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_text},
            ],
            max_tokens=max_new,
            temperature=temp if temp > 0 else 0.0,
        )
        return (out["choices"][0]["message"]["content"] or "").strip()
    except SystemExit:
        raise
    except Exception as e:
        emit_err("completion_failed", f"GGUF completion failed: {type(e).__name__}", EXIT_FAILED, mode="gguf")
    raise AssertionError("unreachable")


def generate_transformers(model_id: str, system: str, user_text: str, max_new: int, temp: float, offline: bool) -> str:
    try:
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer
    except ImportError:
        emit_err("local_model_unavailable",
                 "transformers/torch not installed for CI smoke backend.",
                 EXIT_UNAVAILABLE, mode="transformers", model=model_id)
    if offline:
        os.environ["HF_HUB_OFFLINE"] = os.environ["TRANSFORMERS_OFFLINE"] = "1"
    off = os.environ.get("HF_HUB_OFFLINE") == "1"
    try:
        tok = AutoTokenizer.from_pretrained(model_id, local_files_only=off)
        kw = {"torch_dtype": torch.bfloat16, "device_map": "auto"} if torch.cuda.is_available() else {}
        m = AutoModelForCausalLM.from_pretrained(model_id, local_files_only=off, **kw)
    except OSError as e:
        if off:
            emit_err("local_model_unavailable",
                     f"{model_id} not in local HF cache; refusing to download ({type(e).__name__}).",
                     EXIT_UNAVAILABLE, mode="transformers", model=model_id)
        emit_err("completion_failed", f"model load failed: {type(e).__name__}", EXIT_FAILED,
                 mode="transformers", model=model_id)
    try:
        m.eval()
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user_text},
        ]
        ids = tok.apply_chat_template(messages, add_generation_prompt=True, return_tensors="pt")
        if not torch.is_tensor(ids):
            ids = ids["input_ids"]
        ids = ids.to(m.device)
        with torch.no_grad():
            out = m.generate(
                ids,
                max_new_tokens=max_new,
                do_sample=temp > 0,
                temperature=temp or None,
                pad_token_id=tok.eos_token_id,
            )
        return tok.decode(out[0][ids.shape[1]:], skip_special_tokens=True).strip()
    except SystemExit:
        raise
    except Exception as e:
        emit_err("completion_failed", f"transformers completion failed: {type(e).__name__}",
                 EXIT_FAILED, mode="transformers", model=model_id)
    raise AssertionError("unreachable")


def user_text_from_messages(messages: list) -> str:
    # Clients must not send system; ignore/reject system+tool
    parts = []
    for m in messages:
        role = m.get("role")
        if role in ("system", "tool"):
            emit_err("input_refused", f"role {role!r} not allowed from client", EXIT_INPUT)
        if role == "user":
            parts.append(str(m.get("content") or ""))
        elif role == "assistant":
            continue  # history optional; M1 one-shot uses last user
        else:
            emit_err("input_refused", f"unknown role {role!r}", EXIT_INPUT)
    if not parts:
        emit_err("input_refused", "no user message", EXIT_INPUT)
    return parts[-1]


def read_stdin_request() -> tuple[str, int]:
    raw = sys.stdin.read()
    if not raw.strip():
        emit_err("input_refused", "empty stdin JSON", EXIT_INPUT)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        emit_err("input_refused", "stdin must be one JSON object", EXIT_INPUT)
    if not isinstance(data, dict):
        emit_err("input_refused", "stdin JSON must be an object", EXIT_INPUT)
    max_tokens = int(data.get("max_tokens") or data.get("maxTokens") or 512)
    max_tokens = max(1, min(max_tokens, 1024))
    if "messages" in data:
        return user_text_from_messages(data["messages"]), max_tokens
    if "question" in data or "prompt" in data:
        return str(data.get("question") or data.get("prompt") or ""), max_tokens
    emit_err("input_refused", "stdin JSON needs messages[] or question", EXIT_INPUT)
    raise AssertionError("unreachable")


def main() -> None:
    p = argparse.ArgumentParser(description="Salomon offline local ask (Phase 3 M1)")
    p.add_argument("--backend", choices=("gguf", "transformers", "auto"), default="auto")
    p.add_argument("--gguf", help="explicit GGUF path")
    p.add_argument("--model", default="Qwen/Qwen2.5-0.5B-Instruct")
    p.add_argument("--prompt", help="one-shot user prompt; use '-' for stdin (plain text, off argv/ps); ignored if --json")
    p.add_argument("--system", default=None, help="override prompt file (dev only)")
    p.add_argument("--max-new", type=int, default=256)
    p.add_argument("--temp", type=float, default=0.2)
    p.add_argument("--json", action="store_true",
                   help="stdin JSON in → one JSON object out (LocalCompleter /api/ask)")
    p.add_argument("--online-ok", action="store_true")
    p.add_argument("--print-prompt-path", action="store_true",
                   help="print source-care prompt path and exit 0")
    a = p.parse_args()

    if a.print_prompt_path:
        print(str(PROMPT_FILE.resolve()))
        raise SystemExit(EXIT_OK)

    if a.json:
        os.environ["_ASK_LOCAL_JSON"] = "1"

    system = load_system_prompt(a.system)

    if a.json:
        user_text, max_new = read_stdin_request()
    else:
        if not a.prompt:
            emit_err("input_refused", "--prompt required unless --json (use --prompt - for stdin)", EXIT_INPUT)
        if a.prompt == "-":
            user_text = sys.stdin.read()
            if not user_text.strip():
                emit_err("input_refused", "empty stdin for --prompt -", EXIT_INPUT)
        else:
            user_text = a.prompt
        max_new = a.max_new

    if scan_text(user_text):
        if a.json:
            emit_json({
                "ok": False,
                "reason": "input_refused",
                "refuse_reason": "input_refused",
                "message": SAFETY_MSG,
                "answer": None,
                "mode": None,
            }, EXIT_INPUT)
        print(SAFETY_MSG)
        raise SystemExit(EXIT_INPUT)

    offline = _offline_default() and not a.online_ok
    backend = a.backend
    if backend == "auto":
        env = os.environ.get("SALOMON_GGUF", "").strip() or (a.gguf or "")
        prefer = read_manifest_filename() or PRODUCT_GGUF_NAME
        if env and Path(env).expanduser().is_file():
            backend = "gguf"
        elif (DEFAULT_GGUF_DIR / prefer).is_file() or (REPO / "phase3-runtime" / "artifacts" / prefer).is_file():
            backend = "gguf"
        else:
            d0 = Path(os.environ.get("SALOMON_GGUF_DIR") or DEFAULT_GGUF_DIR)
            found = [
                x for x in list(d0.glob("*Q4_K_M*.gguf")) + list(d0.glob("*q4_k_m*.gguf"))
                if x.is_file() and "-of-" not in x.name
            ]
            backend = "gguf" if (len(found) == 1 or a.gguf) else "transformers"

    if backend == "gguf":
        gguf = resolve_gguf(a.gguf)
        if not a.json:
            status_line(gguf, "gguf", None)
        answer = generate_gguf(gguf, system, user_text, max_new, a.temp)
        mode, model = "gguf", "qwen2.5-7b-instruct-q4_k_m"
        if a.json:
            emit_json({
                "ok": True,
                "answer": answer,
                "mode": mode,
                "model": model,
                "backend": mode,
                "gguf": gguf.name,
                "gguf_sha256_expected": PRODUCT_GGUF_SHA256,
                "refuse_reason": None,
                "message": None,
                "prompt_path": str(PROMPT_FILE.resolve()),
            }, EXIT_OK)
        print(answer)
        return

    if offline:
        os.environ.setdefault("HF_HUB_OFFLINE", "1")
        os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
        if not a.json:
            print("[ask_local] offline transformers (no HF download)", file=sys.stderr)
    elif not a.json:
        print("[ask_local] WARN: transformers may hit network (--online-ok)", file=sys.stderr)
    if not a.json:
        status_line(None, "transformers", a.model)
    answer = generate_transformers(a.model, system, user_text, max_new, a.temp, offline)
    if a.json:
        emit_json({
            "ok": True,
            "answer": answer,
            "mode": "transformers",
            "model": a.model,
            "backend": "transformers",
            "refuse_reason": None,
            "message": None,
            "prompt_path": str(PROMPT_FILE.resolve()),
        }, EXIT_OK)
    print(answer)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as e:
        if os.environ.get("_ASK_LOCAL_JSON") == "1" or "--json" in sys.argv:
            sys.stdout.write(json.dumps({
                "ok": False,
                "reason": "completion_failed",
                "refuse_reason": "completion_failed",
                "message": f"unexpected error: {type(e).__name__}",
                "answer": None,
            }) + "\n")
        raise SystemExit(EXIT_FAILED)

