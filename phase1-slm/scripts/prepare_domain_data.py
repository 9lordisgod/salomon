#!/usr/bin/env python3
"""Build the seed dataset (messages-format JSONL) for Salomon, a private local AI / personal research agent.

File-only: records come from data/extra/*.jsonl (same format:
{"messages":[{"role":"user",...},{"role":"assistant",...}], "tags":[...]}).
Preferred tags: privacy, personal_ai, safety, consent, data_minimization, local_inference,
prompt_injection, memo_injection. Crypto domain (near/crypto/onchain/cypherpunk) REMOVED 2026-10-29 by Lead;
Data Curator owns the privacy replacement rows.
All records are secret-scanned (scripts/secret_scan.py) before writing; any hit -> exit 1, no output.
"""
import argparse, json, random, glob, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from secret_scan import scan_record
from pathlib import Path

# Inline SEED intentionally empty: crypto tuples removed 2026-10-29 (Lead scrub).
# Do not re-add crypto categories; add privacy rows as data/extra/*.jsonl (Data Curator).
SEED = []
BANNED_TAGS = {"near", "crypto", "onchain", "cypherpunk"}

def to_record(tag, q, a, system):
    msgs = ([{"role":"system","content":system}] if system else []) + [
        {"role":"user","content":q},{"role":"assistant","content":a}]
    return {"messages": msgs, "tags":[tag]}

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--out", default="data/seed_prompts.jsonl")
    p.add_argument("--extra-dir", default="data/extra")
    p.add_argument("--system", default="", help="optional system prompt to embed")
    p.add_argument("--seed", type=int, default=42)
    a = p.parse_args()
    recs, bad, skipped = [], [], 0
    # Preflight: SEED and every data/extra/*.jsonl record go through the same secret scanner.
    for i,(t,q,ans) in enumerate(SEED):
        r = to_record(t,q,ans,a.system)
        bad += [("SEED", i, f, why) for f, why in scan_record(r)]
        recs.append(r)
    for f in sorted(glob.glob(os.path.join(a.extra_dir,"*.jsonl"))):
        for ln, l in enumerate(open(f), 1):
            if not l.strip(): continue
            try: r = json.loads(l)
            except json.JSONDecodeError as e:
                bad.append((f, ln, "-", f"invalid json: {e}")); continue
            bad += [(f, ln, fld, why) for fld, why in scan_record(r)]
            if BANNED_TAGS & set(r.get("tags", [])):
                skipped += 1; continue
            recs.append(r)
    if bad:
        for f, ln, fld, why in bad:
            print(f"REJECT {f}:{ln} field={fld} reason={why}", file=sys.stderr)
        print(f"secret preflight failed ({len(bad)} hit(s)); nothing written to {a.out}", file=sys.stderr)
        sys.exit(1)
    random.Random(a.seed).shuffle(recs)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    with open(a.out,"w") as fh:
        for r in recs: fh.write(json.dumps(r, ensure_ascii=False)+"\n")
    print(f"wrote {len(recs)} examples -> {a.out} (skipped {skipped} crypto-tagged rows)")

if __name__ == "__main__":
    main()
