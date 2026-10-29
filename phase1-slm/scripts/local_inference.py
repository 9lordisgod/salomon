#!/usr/bin/env python3
"""Local chat CLI. --offline (or HF_HUB_OFFLINE=1) guarantees no Hugging Face network calls; on cache miss
it fails closed. Optional --adapter for LoRA. Input that looks like a seed/private key is refused locally:
it never reaches the model, chat history, or stdout."""
import argparse, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import yaml
from secret_scan import scan_text, SAFETY_MSG

CFG = os.path.join(os.path.dirname(__file__), "..", "configs", "model_config.yaml")
DEFAULT_SYS = yaml.safe_load(open(CFG))["system_prompt"]

def load(model_id, adapter=None):
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer
    off = os.environ.get("HF_HUB_OFFLINE") == "1"
    try:
        tok = AutoTokenizer.from_pretrained(model_id, local_files_only=off)
        kw = {"torch_dtype": torch.bfloat16, "device_map": "auto"} if torch.cuda.is_available() else {}
        m = AutoModelForCausalLM.from_pretrained(model_id, local_files_only=off, **kw)
    except OSError as e:
        if off:
            sys.exit(f"[offline] {model_id} not in local HF cache; refusing to download ({type(e).__name__}).")
        raise
    if adapter:
        from peft import PeftModel
        m = PeftModel.from_pretrained(m, adapter, local_files_only=off)
    return tok, m.eval()

def generate(tok, m, messages, max_new=512, temp=0.7):
    import torch
    ids = tok.apply_chat_template(messages, add_generation_prompt=True, return_tensors="pt")
    if not torch.is_tensor(ids):  # transformers>=5 returns BatchEncoding
        ids = ids["input_ids"]
    ids = ids.to(m.device)
    with torch.no_grad():
        out = m.generate(ids, max_new_tokens=max_new, do_sample=temp > 0, temperature=temp or None,
                         pad_token_id=tok.eos_token_id)
    return tok.decode(out[0][ids.shape[1]:], skip_special_tokens=True).strip()

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--model", default="Qwen/Qwen2.5-7B-Instruct")
    p.add_argument("--adapter")
    p.add_argument("--system", default=DEFAULT_SYS)
    p.add_argument("--no-system", action="store_true",
                   help="ABLATION ONLY: removes the safety system prompt. Not for user-facing/untrusted use. "
                        "Requires NEAR_PRIVACY_ALLOW_NO_SYSTEM=1.")
    p.add_argument("--offline", action="store_true",
                   help="set HF_HUB_OFFLINE=1 and TRANSFORMERS_OFFLINE=1; fail if weights are not cached")
    p.add_argument("--prompt", help="single-shot prompt; omit for interactive chat")
    p.add_argument("--max-new", type=int, default=512)
    a = p.parse_args()
    if a.offline:
        os.environ["HF_HUB_OFFLINE"] = os.environ["TRANSFORMERS_OFFLINE"] = "1"
        print("[offline] HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1: no network, cached weights only.", file=sys.stderr)
    elif os.environ.get("HF_HUB_OFFLINE") != "1":
        print("[warn] not offline: Hugging Face may be contacted unless weights are cached; use --offline.", file=sys.stderr)
    if a.no_system:
        if os.environ.get("NEAR_PRIVACY_ALLOW_NO_SYSTEM") != "1":
            sys.exit("--no-system refused: set NEAR_PRIVACY_ALLOW_NO_SYSTEM=1 (ablation only, never user-facing).")
        print("[WARNING] --no-system: safety system prompt removed. Ablation only; not for untrusted users.", file=sys.stderr)
    # Single-shot scrub runs before model load. Exit code 2 = input scrubbed (secret detected, nothing generated).
    if a.prompt and scan_text(a.prompt):
        print(SAFETY_MSG); sys.exit(2)
    tok, m = load(a.model, a.adapter)
    hist = [] if a.no_system else [{"role": "system", "content": a.system}]
    if a.prompt:
        print(generate(tok, m, hist + [{"role": "user", "content": a.prompt}], a.max_new)); return
    print("Local chat (prompts stay on this machine). Ctrl-D to exit.")
    while True:
        try: u = input("> ")
        except EOFError: break
        if scan_text(u):  # never generate on it, never append to hist, never echo it
            print(SAFETY_MSG); u = None; continue
        hist.append({"role": "user", "content": u})
        r = generate(tok, m, hist, a.max_new); print(r)
        hist.append({"role": "assistant", "content": r})

if __name__ == "__main__":
    main()
