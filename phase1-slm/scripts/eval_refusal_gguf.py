#!/usr/bin/env python3
"""Privacy-rebuild refusal / must-not-echo gate on the PINNED LOCAL GGUF (no GPU, no network).

Same scoring as eval_harness.check_safety (REFUSAL_EVAL_CRITERIA.md: hard fail, no quote exemption),
but runs the shipped product path: llama.cpp GGUF + the canonical source-care system prompt
(configs/source_care_system.txt) — not the HF/transformers DEFAULT_SYS.

Exit: 0 = all cases pass; 1 = any case failed; 2 = usage / suite missing; 3 = GGUF unavailable.
Run offline:  unshare -rn python scripts/eval_refusal_gguf.py --gguf models/gguf/salomon-qwen25-7b-instruct-Q4_K_M.gguf
"""
import argparse, hashlib, json, os, sys, time
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from eval_harness import check_safety  # single source of truth for scoring

def sha256_file(p, n=1 << 20):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(n), b""): h.update(b)
    return h.hexdigest()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gguf", required=True, help="single-file pinned Q4_K_M GGUF (desktop 7B default)")
    ap.add_argument("--refusal", default=os.path.join(ROOT, "data/eval_refusal.jsonl"))
    ap.add_argument("--system", default=os.path.join(ROOT, "configs/source_care_system.txt"))
    ap.add_argument("--out", default=os.path.join(ROOT, "outputs/eval_refusal_gguf_results.jsonl"))
    ap.add_argument("--summary", default=None, help="markdown summary path (default: <out>.md)")
    ap.add_argument("--max-new", type=int, default=300)
    ap.add_argument("--threads", type=int, default=os.cpu_count() or 4)
    ap.add_argument("--no-hash", action="store_true", help="skip sha256 of the GGUF (faster)")
    a = ap.parse_args()
    if not os.path.isfile(a.refusal): print(f"error: refusal suite not found: {a.refusal}", file=sys.stderr); sys.exit(2)
    if not os.path.isfile(a.gguf) or "-of-" in os.path.basename(a.gguf):
        print(f"error: GGUF unavailable or split shard: {a.gguf}", file=sys.stderr); sys.exit(3)
    rows = [json.loads(l) for l in open(a.refusal) if l.strip()]
    if not rows: print("error: empty refusal suite", file=sys.stderr); sys.exit(2)
    system = open(a.system, encoding="utf8").read().strip()
    if not system: print("error: empty system prompt", file=sys.stderr); sys.exit(2)
    from llama_cpp import Llama
    llm = Llama(model_path=a.gguf, n_ctx=4096, n_threads=a.threads, seed=0, verbose=False)
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    failed, recs = [], []
    with open(a.out, "w") as fh:
        for r in rows:
            t0 = time.time()
            out = llm.create_chat_completion(messages=[{"role": "system", "content": system}, {"role": "user", "content": r["prompt"]}],
                                             max_tokens=a.max_new, temperature=0.0, top_p=1.0, seed=0)
            ans = out["choices"][0]["message"]["content"] or ""
            fails = check_safety(r, ans)
            rec = {"id": r.get("id"), "expect": r.get("expect"), "safety_pass": not fails, "safety_fail_reasons": fails,
                   "answer": ans, "seconds": round(time.time() - t0, 1)}
            fh.write(json.dumps(rec) + "\n"); fh.flush(); recs.append(rec)
            print(f"[SAFETY {'PASS' if not fails else 'FAIL'}] {r.get('id','?')} ({rec['seconds']}s) {'; '.join(fails)}", flush=True)
            if fails: failed.append(r.get("id"))
    n = len(rows); verdict = "GREEN" if not failed else "NOT GREEN"
    meta = {"gguf": os.path.basename(a.gguf), "sha256": None if a.no_hash else sha256_file(a.gguf),
            "system_prompt_sha256": hashlib.sha256(system.encode()).hexdigest(), "suite": os.path.relpath(a.refusal, ROOT),
            "suite_sha256": sha256_file(a.refusal), "temperature": 0.0, "max_new": a.max_new, "network": os.environ.get("SALOMON_NETNS", "unknown")}
    summ = a.summary or os.path.splitext(a.out)[0] + ".md"
    with open(summ, "w") as s:
        s.write(f"# Privacy-rebuild refusal eval — local GGUF — {n - len(failed)}/{n} {verdict}\n\n")
        s.write("Scorer: `eval_harness.check_safety` (hard fail, no quote exemption). Prompt: `configs/source_care_system.txt`.\n\n")
        s.write("```json\n" + json.dumps(meta, indent=2) + "\n```\n\n| id | expect | result | reasons |\n|---|---|---|---|\n")
        for rec in recs:
            s.write(f"| {rec['id']} | {rec['expect']} | {'PASS' if rec['safety_pass'] else 'FAIL'} | {'; '.join(rec['safety_fail_reasons']).replace('|','/')} |\n")
    print(f"safety: {n - len(failed)}/{n} passed; failures={len(failed)} {failed} -> {a.out} / {summ}")
    sys.exit(1 if failed else 0)

if __name__ == "__main__":
    main()
