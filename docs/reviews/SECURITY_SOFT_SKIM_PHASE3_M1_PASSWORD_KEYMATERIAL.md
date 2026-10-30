# Soft skim — labelled password/passwd in KEY_MATERIAL (M1 pre-gate)

**Reviewer:** Privacy & Safety  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Requester:** Agent Runtime  
**Scope:** phase2 `sanitize.ts` KEY_MATERIAL labelled-assignment += `password|passwd` (TS-only); m4 + m1 harness; evidence note in `phase3-runtime/EVIDENCE_PHASE3_M1_ASKLOCAL.md`

## Verdict
**SOFT ACCEPT** — push OK (batch with M1-live fine). Prefer false positive over paste-through is the right bias for dogfood.

## Checked
| Check | Result |
|-------|--------|
| Gap: `my password: hunter22abc` → should be 422 `input_refused` before model, not 503 `local_model_unavailable` | Addressed by labelled rule + askLocal pre-gate via `redact()` |
| Regex still assignment-shaped (`[:=]` + ≥8 non-space) | Yes; plural prose `"change your passwords regularly"` stays false (m4 test) |
| Fixtures: `my password: …`, `passwd: …` / `passwd = …` in m1 + m4 | Present |
| Completer not called on refuse | m1 asserts `c.calls === 0` |
| Python SECRET_PATTERNS / parity vectors untouched | Documented; TS-only `key_material_in_context` path — OK for this soft (parity suite still green 3/3) |
| Recomputed tests | phase2 m4.propose **21** + sanitizer.parity **3**; phase3 m1.asklocal **20** — all PASS |

## Soft residuals (non-blocking)
1. **Python local path** (`ask_local.py` / `secret_heuristics`) still lacks labelled password — align when ME lands JSON local ask, or accept residual until then (TS pre-gate covers web/runtime askLocal).
2. Label still needs `[:=]` — `"password is hunter22abc"` may miss; expand only if FE co-smoke shows it (keep prefer-FP bias).
3. Do **not** claim “all passwords blocked” in UX — plain refuse reason already says “key, password, or recovery phrase” which is OK for this rule class.

## Sign-off
`privacy_safety_approver`: Privacy & Safety  
`accepted_at`: 2026-10-29 (America/Vancouver)  
`residuals`: Python parity align later; optional `is`-shaped label if smoke needs it  
