#!/usr/bin/env python3
"""Baseline vs. tuned eval report. Reads two eval_harness.py result JSONLs (same harness,
same data, same system prompt) and writes a markdown report with per-prompt keyword deltas
and per-case safety PASS/FAIL. Keyword score is informational; safety results are the gate.
Usage: python scripts/compare_evals.py --base outputs/eval_base_0.5b.jsonl \
         --tuned outputs/eval_tuned_0.5b.jsonl --out outputs/eval_compare_0.5b.md"""
import argparse, json, sys

def load(path):
    rows = [json.loads(l) for l in open(path) if l.strip()]
    kw = {r["prompt"]: r for r in rows if "expect" not in r}
    sf = {r.get("id", r["prompt"][:40]): r for r in rows if "expect" in r}
    return kw, sf

def mean(xs): return sum(xs) / len(xs) if xs else 0.0

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--base", required=True); p.add_argument("--tuned", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--base-label", default="base"); p.add_argument("--tuned-label", default="tuned")
    a = p.parse_args()
    bk, bs = load(a.base); tk, ts = load(a.tuned)
    common = [k for k in bk if k in tk]
    if not common and not (set(bs) & set(ts)):
        sys.exit("error: no overlapping rows between base and tuned results")
    L = [f"# Eval compare: {a.base_label} vs {a.tuned_label}", "",
         f"- base: `{a.base}`", f"- tuned: `{a.tuned}`",
         "- Keyword score is informational only. Safety (refusal / must-not-echo) is the gate.", ""]
    bm, tm = mean([bk[k]["score"] for k in common]), mean([tk[k]["score"] for k in common])
    L += [f"## Keyword rubric ({len(common)} prompts)", "",
          f"Mean: {bm:.3f} -> {tm:.3f} (delta {tm-bm:+.3f})", "",
          "| prompt | base | tuned | delta |", "|---|---|---|---|"]
    for k in common:
        b, t = bk[k]["score"], tk[k]["score"]
        L.append(f"| {k[:70].replace('|','/')} | {b:.2f} | {t:.2f} | {t-b:+.2f} |")
    ids = [i for i in bs if i in ts]
    bp = sum(bs[i]["safety_pass"] for i in ids); tp = sum(ts[i]["safety_pass"] for i in ids)
    L += ["", f"## Safety suite ({len(ids)} cases)", "", f"PASS: {bp}/{len(ids)} -> {tp}/{len(ids)}", "",
          "| id | base | tuned | tuned fail reasons |", "|---|---|---|---|"]
    for i in ids:
        f = lambda r: "PASS" if r["safety_pass"] else "FAIL"
        L.append(f"| {i} | {f(bs[i])} | {f(ts[i])} | {'; '.join(ts[i]['safety_fail_reasons']).replace('|','/')} |")
    regress = [i for i in ids if bs[i]["safety_pass"] and not ts[i]["safety_pass"]]
    L += ["", f"Safety regressions (base PASS -> tuned FAIL): {regress or 'none'}", ""]
    open(a.out, "w").write("\n".join(L))
    print("\n".join(L))
    sys.exit(1 if regress else 0)

if __name__ == "__main__":
    main()
