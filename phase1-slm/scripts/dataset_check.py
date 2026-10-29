#!/usr/bin/env python3
"""Dataset quality check for Phase 1 SLM data (messages-format JSONL).

Checks: schema (roles, non-empty content, last turn = assistant), duplicate
user prompts (case/whitespace-normalized), and tag balance. Exits 1 on schema
errors or duplicates so it can gate `make data`. Read-only; never prints content
beyond the first 60 chars of a duplicated prompt (secret_scan already runs in
prepare_domain_data.py).

Usage: python scripts/dataset_check.py [--file data/seed_prompts.jsonl] [--target 2000]
"""
import argparse, collections, json, re, sys

ROLES = {"system", "user", "assistant"}

def norm(s): return re.sub(r"\s+", " ", s.strip().lower())

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--file", default="data/seed_prompts.jsonl")
    p.add_argument("--target", type=int, default=2000)
    a = p.parse_args()
    errs, seen, dups = [], {}, []
    tags = collections.Counter(); n = 0
    for ln, line in enumerate(open(a.file), 1):
        if not line.strip(): continue
        n += 1
        try: r = json.loads(line)
        except json.JSONDecodeError as e: errs.append(f"{ln}: invalid json ({e})"); continue
        msgs = r.get("messages")
        if not isinstance(msgs, list) or len(msgs) < 2:
            errs.append(f"{ln}: messages missing or <2 turns"); continue
        for m in msgs:
            if m.get("role") not in ROLES or not str(m.get("content", "")).strip():
                errs.append(f"{ln}: bad role or empty content"); break
        if msgs[-1].get("role") != "assistant": errs.append(f"{ln}: last turn not assistant")
        tags.update(r.get("tags") or ["(untagged)"])
        user = " | ".join(norm(m.get("content", "")) for m in msgs if m.get("role") == "user")
        if user in seen: dups.append((ln, seen[user], user[:60]))
        else: seen[user] = ln
    print(f"records: {n}  (target {a.target}, {100*n/max(a.target,1):.1f}%)")
    print("tags:", ", ".join(f"{t}={c}" for t, c in tags.most_common()))
    for e in errs: print("SCHEMA", e, file=sys.stderr)
    for ln, first, u in dups: print(f"DUP line {ln} repeats line {first}: {u!r}", file=sys.stderr)
    if errs or dups:
        print(f"FAIL: {len(errs)} schema error(s), {len(dups)} duplicate prompt(s)", file=sys.stderr); sys.exit(1)
    print("OK")

if __name__ == "__main__":
    main()
