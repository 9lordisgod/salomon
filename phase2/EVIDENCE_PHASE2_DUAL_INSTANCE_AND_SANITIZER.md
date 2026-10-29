# Phase 2 — dual-instance live + live DENY + sanitizer parity (digest-only)
Run: 2026-10-29 ~17:10Z (10:10 America/Vancouver). Model `z-ai/glm-5.3-flash` only. No Abliterated. API key never printed (grep check 0 hits in evidence).
`measurements.json` sha256 `09ce9a2df0ae2cc555b08d8f4df6f14f3cff330550d035c682eccc2ad9c0cbb8` (2 PS entries, unmodified by this work).

## 1. Live both pins (`npm run demo -- --no-tool`, stopped after 2/12 attempts once both seen)
| run | instance | compose | rtmr3 | attest | loop |
|---|---|---|---|---|---|
| evidence/dual/run_1.json | 7bb9af0a… (gpu04, 2nd pin, effective 17:10Z) | 5f7ebd85… | e0f6c83e… | pass | ok (verified complete+bind) |
| evidence/dual/run_2.json | 19aea169… (gpu03, 1st pin) | a0e3c6f4… | 463b2e18… | pass | ok |

## 2. Live DENY (`phase1.5-attestation/scripts/runVerifiedRemoteGlm.ts --negative-only` → evidence/dual/live_deny_negative.json)
- `openai/privacy-filter` (real, not allowlisted): denied, check=`allowlist`, "no exact allowlist pin".
- GLM against empty temp allowlist: denied, check=`allowlist_load` (deny-all).
Re-attest≤3 on allowlist miss / immediate DENY on non-allowlist checks (CM missing) covered by M2 mock tests in `test/phase2.test.ts`.

## 3. Sanitizer (choice a) — see SANITIZER.md
TS port parity-tested vs Python on 17 vectors. phase2 vitest 18/18 (15 + 3 new), tsc clean. Python privacy/: test_sanitizer 17/17, test_policy_spend 11/11 (unmodified).
