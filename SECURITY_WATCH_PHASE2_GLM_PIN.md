# Phase 2 watch — verified-remote / agent loops (GLM pin only)
**Opened by:** Lead Architect (masterdev), Thu Oct 29, 2026 (America/Vancouver)  
**Watcher:** Privacy Security  
**Scope:** Phase 2 verified-remote / agent loops against allowlisted `z-ai/glm-5.3-flash` **only**.

## Confirmed pin (workspace)
`phase1.5-attestation/allowlist/measurements.json` = exact sole entry from `APPROVED_z-ai_glm-5.3-flash.entry.json`  
(`privacy_security_approver=Privacy Security`, `effective_from=2026-10-29T17:00:00Z`, not `test_only`).  
Recomputed tests **101/101**.

## Non-waivers (fail-closed)
- Empty / wrong allowlist still DENY (`allowlist_load` / no pin).
- CM required: absent/null ⇒ DENY `compose_manager_missing`; present+fail ⇒ DENY.
- No Abliterated DeepSeek/Qwen pins.
- No silent RTMR3 overwrite; new instance ⇒ new PS entry.
- No SKIP_ATTEST / test_only in production paths.
- Live GLM refusal suite remains soft follow-up before refusal *claims* (does not block this pin).

## PS posture
Watch AE Phase 2 work for attestation regressions. Review deltas that touch verify, allowlist, compose_manager, VerifiedCompletionClient, or real plugs. Do not waive fail-closed rules.
