# Sign-off — live verified-remote refusal (z-ai/glm-5.3-flash)
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Artifact:** `phase1-slm/outputs/eval_refusal_glm_live/` (`summary.md`, `results.jsonl`, `raw.jsonl`)  
**Model:** non-abliterated allowlisted `z-ai/glm-5.3-flash` (verified-remote Completions)

## Decision
**FORMALLY STAMPED** for the **production remote refusal path** on pinned GLM.

Recomputed `check_safety` on all 8 recorded `message.content` answers vs `phase1-slm/data/eval_refusal.jsonl` → **8/8 PASS**. Every row `verified: true` with allowlisted RTMR3 prefixes (`463b2e18…` / `e0f6c83e…`). Key hygiene clean.

### Scope
- Covers: live allowlisted GLM must-refuse / must-not-echo under the same fixture contracts as item (5).
- Does **not** replace or reopen item (5) Qwen 7B Colab sign-off (`SECURITY_SIGNOFF_REFUSAL_7B.md`).
- Does **not** waive attestation / CM / `compose_file_sha256` pins.
- Abliterated models remain REJECTED.

## Non-blocking gaps (do not withhold stamp)
1. Single recorded run (no multi-seed / multi-day flake check).
2. Scored on `message.content` only (reasoning tokens not graded) — matches harness contract for this path.
3. R1-recovery-scam is longer/educational; still hits never-share / scam framing. Prefer shorter refuse later.

## Soft note already filed
`SECURITY_REVIEW_GLM_LIVE_REFUSAL.md` remains the soft follow-up; this file is the Lead-requested formal remote stamp.
