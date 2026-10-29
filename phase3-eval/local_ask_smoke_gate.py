#!/usr/bin/env python3
"""Phase 3 M1 offline-ask fail-closed smoke gate (model-free, stdlib only).

Modes:
  default            : requires phase3-cli + a smoke report (--report / SALOMON_P3_M1_REPORT). Missing -> exit 2.
  hooks-only         : SALOMON_P3_M1_HOOKS_ONLY=1 -> prep self-test only (NOT a substitute for real smoke in CI).
Exit: 0 pass, 1 report check failed, 2 missing CLI/report/prep integrity broken.
"""
import argparse, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
CRITERIA = os.path.join(ROOT, "docs/acceptance/PHASE3_M1_LOCAL_ASK_SMOKE.md")
EXAMPLE = os.path.join(HERE, "fixtures/local_ask_smoke.example.json")
DEFERRED = os.path.join(HERE, "fixtures/source_id_echo")
CLI_DIR = os.path.join(ROOT, "phase3-cli")
VERSION = "p3-m1-1"

def _is(v, t): return type(v) is t
CASES = [
 ("M1-01", "offline ask completes, zero network", lambda r: r.get("ask_completed") is True and _is(r.get("network_calls"), int) and r["network_calls"] == 0),
 ("M1-02", "local inference default, no remote", lambda r: r.get("default_local_inference") is True and r.get("remote_used") is False),
 ("M1-03", "sanitizer runs before model", lambda r: r.get("sanitizer_ran") is True and r.get("sanitizer_before_model") is True),
 ("M1-04", "secret probe rejected pre-model with reason", lambda r: isinstance(r.get("secret_probe"), dict) and r["secret_probe"].get("rejected") is True
     and r["secret_probe"].get("model_called") is False and isinstance(r["secret_probe"].get("reason"), str) and r["secret_probe"]["reason"].strip() != ""),
 ("M1-05", "tool results UNTRUSTED-wrapped", lambda r: r.get("untrusted_envelope") is True),
 ("M1-06", "propose blocks until decision, no silent action", lambda r: r.get("propose_blocked_without_approve") is True and _is(r.get("silent_actions"), int) and r["silent_actions"] == 0),
 ("M1-07", "credentials outside model", lambda r: r.get("no_secret_in_model_args") is True),
 ("M1-08", "no prompt transcript by default", lambda r: r.get("no_prompt_transcript") is True and r.get("transcript_files") == []),
 ("M1-09", "plain refuse/mask reasons", lambda r: r.get("plain_reasons") is True),
]

def check_report(r):
    if not isinstance(r, dict): return ["report is not a JSON object"]
    if r.get("report_version") != VERSION: return [f"report_version != {VERSION}"]
    fails = []
    for cid, desc, fn in CASES:
        try: ok = fn(r)
        except Exception as e: ok = False; desc += f" (error {e})"
        print(f"{'PASS' if ok else 'FAIL'} {cid} {desc}")
        if not ok: fails.append(cid)
    return fails

def self_test():
    errs = []
    if not os.path.isfile(CRITERIA): errs.append("criteria doc missing")
    else:
        t = open(CRITERIA).read()
        for cid, _, _ in CASES:
            if cid not in t: errs.append(f"{cid} not in criteria doc")
        if "OUT OF SCOPE for M1" not in t: errs.append("M2+ out-of-scope section missing")
    ids = [c[0] for c in CASES]
    if len(ids) != len(set(ids)) or not all(callable(c[2]) and c[1] for c in CASES): errs.append("checklist schema invalid")
    try:
        ex = json.load(open(EXAMPLE))
        if check_report(ex): errs.append("example report does not pass")
        for cid, _, fn in CASES:  # negative: flipping must fail every check (no vacuous pass)
            bad = {k: v for k, v in ex.items()}
            bad.update({"ask_completed": False, "network_calls": 1, "remote_used": True, "sanitizer_before_model": False,
                        "secret_probe": {"rejected": False}, "untrusted_envelope": False, "silent_actions": 1,
                        "no_secret_in_model_args": False, "transcript_files": ["x"], "plain_reasons": False})
            if fn(bad): errs.append(f"{cid} passes a bad report")
        if check_report({}) == []: errs.append("empty report passes")
    except Exception as e: errs.append(f"example fixture unreadable: {e}")
    if not os.path.isdir(DEFERRED) or sorted(os.listdir(DEFERRED)) != ["README.md"]:
        errs.append("fixtures/source_id_echo must contain only README.md (deferred to M2+)")
    return errs

def main():
    p = argparse.ArgumentParser(); p.add_argument("--report", default=os.environ.get("SALOMON_P3_M1_REPORT"))
    a = p.parse_args()
    if os.environ.get("SALOMON_P3_M1_HOOKS_ONLY") == "1":
        print("== HOOKS-ONLY prep self-test (not a substitute for real smoke in CI) ==")
        errs = self_test()
        for e in errs: print("PREP FAIL:", e, file=sys.stderr)
        print("prep integrity:", "OK" if not errs else "BROKEN"); sys.exit(2 if errs else 0)
    if not a.report:
        if not os.path.isdir(CLI_DIR):
            print("FAIL-CLOSED: phase3-cli/ not found; offline ask smoke cannot run. (Prep only: SALOMON_P3_M1_HOOKS_ONLY=1)", file=sys.stderr); sys.exit(2)
        print("FAIL-CLOSED: no smoke report (--report or SALOMON_P3_M1_REPORT)", file=sys.stderr); sys.exit(2)
    try: r = json.load(open(a.report))
    except Exception as e: print(f"FAIL-CLOSED: cannot read report {a.report}: {e}", file=sys.stderr); sys.exit(2)
    fails = check_report(r)
    print(f"offline ask fail-closed: {len(CASES)-len(fails)}/{len(CASES)} passed" if isinstance(r, dict) and r.get("report_version")==VERSION else "report rejected: " + "; ".join(fails))
    sys.exit(1 if fails else 0)

if __name__ == "__main__": main()
