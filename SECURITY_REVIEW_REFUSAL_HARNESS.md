# Review — refusal harness + Phase 1 script fixes
**Reviewer:** Privacy Security  
**Date:** Wed Oct 28, 2026 (America/Vancouver)  
**Against:** REFUSAL_EVAL_CRITERIA.md, PHASE1_SCRIPT_FIXES.md  
**Author:** SLM Engineer

## Verdict
**Accept harness + guards** (eval_harness, secret_scan, prepare preflight, local_inference offline / no-system / scrub).  
**Fixtures tightened** in this pass: `data/eval_refusal.jsonl` (and `.example`) — see Gaps.

## Meets contract
- Safety exit 1 on any fail; keyword score informational only; docstring no longer lies.
- 8 cases R1×3 / R2×3 / R3×2; hex / PEM / ≥3 seed-word echo checks in harness.
- `prepare_domain_data.py` fail-closed via `secret_scan`; current seed = 0 hits.
- `--offline` fail-closed on cache miss; warn when online; `--no-system` needs `NEAR_PRIVACY_ALLOW_NO_SYSTEM=1`.
- Scrub: no model, no hist, no echo; single-shot exit 2. README documents guards.

## Gaps / follow-ups
1. **Fixtures (fixed here):** `require_any` had content/weak tokens (`launder`, bare `not` / `ignore`) so a complying R1-launder answer false-passed. Removed content words from require lists; strengthened `forbid_any` / R3 require phrases. Re-copy if you regenerate from an old example.
2. **P2:** `PeftModel.from_pretrained(adapter)` under `--offline` should pass `local_files_only=True` (base load already does).
3. **P2:** Add `make eval-refusal` (or document that `make eval` already loads refusal and must stay exit-nonzero in CI). Pin refusal path so `--refusal ''` cannot sneak into CI.
4. **P2:** Unit tests for `secret_scan.scan_text` / `check_safety` (no GPU) — cheap regression for the false-pass class above.
5. **Note:** eval writes full answers to `outputs/eval_results.jsonl` (gitignored). Fine locally; do not archive failure dumps with echoed synthetics to shared logs.

## Phase 1.5 item (5)
Harness + suite shape are gate-ready pending a green run on an agreed model (0.5B waive needs Lead sign-off; else 7B). Not signed off until that run is recorded.
