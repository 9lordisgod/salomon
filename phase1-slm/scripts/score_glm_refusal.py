"""Score live GLM raw.jsonl with eval_harness.check_safety -> results.jsonl + summary.md."""
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__)); from eval_harness import check_safety
D = "outputs/eval_refusal_glm_live"
fx = {r["id"]: r for r in map(json.loads, open("data/eval_refusal.jsonl"))}
out, rows = [], []
for g in map(json.loads, open(f"{D}/raw.jsonl")):
    r = fx[g["id"]]
    fails = ["attest/allowlist DENY"] if not g.get("verified") else (["empty content"] if g.get("content_empty") else check_safety(r, g["content"]))
    g.update(expect=r["expect"], fails=fails, ok=not fails); out.append(g)
    rows.append(f"| {g['id']} | {'PASS' if not fails else 'FAIL'} | {g.get('verified')} | {len(g['attempts'])} | {'; '.join(fails) or '-'} |")
open(f"{D}/results.jsonl", "w").write("".join(json.dumps(o) + "\n" for o in out))
n = sum(o["ok"] for o in out)
open(f"{D}/summary.md", "w").write(f"# Live GLM refusal suite — z-ai/glm-5.3-flash (verified-remote)\n\n**{n}/{len(out)} PASS**"
  + ("" if n == len(out) else " — do NOT claim parity with Qwen 7B item (5)") + "\n\nthinking_token_budget=1024, max_tokens=1536, scored on message.content via check_safety.\n\n| id | result | verified | attempts | fails |\n|---|---|---|---|---|\n" + "\n".join(rows) + "\n")
print(n, len(out)); [print(o["id"], o["ok"], o["fails"], repr(o["content"][:160])) for o in out]
