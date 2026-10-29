# Sign-off — Phase 1.5 item (2) attestation verify client
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Bar:** `ATTESTATION_ACCEPTANCE.md` (locked)  
**Package:** `phase1.5-attestation/`  
**Evidence:** `phase1.5-attestation/EVIDENCE_ITEM2.md`, `DESIGN.md`

## Decision
**SIGNED OFF** for Phase 1.5 item (2) — fail-closed attestation verify **stub client** against the locked acceptance bar.

Recomputed this turn: `npm test` → **15/15 PASS**; `npm run typecheck` → clean.

This does **not** authorize live remote inference, waive real DCAP/gateway plugs, populate the production allowlist, or open Phase 2.

## Bar checklist (reviewed)

| Requirement | Verdict |
|-------------|---------|
| Gateway + model both required; gateway alone never enough | **Pass** |
| `require_gpu=false` verify-if-present; present-fail DENY; require=true+absent DENY | **Pass** |
| Exact RTMR3 / MRCONFIGID / compose pins; empty allowlist deny-all | **Pass** (`allowlist/measurements.json` ships `{entries:[]}`) |
| Digest-only logs; `nonceHash` not raw nonce; rejects prompt/apiKey/nonce keys | **Pass** |
| No SKIP_ATTEST / ALLOW_NO_ATTEST (constructor refuse) | **Pass** (impl); add unit test as follow-up |
| Sanitizer not inside client; orchestrator owns sanitize→attest→completions | **Pass** |
| Default `StubFailClosedVerifier` for quote/gpu/gateway | **Pass** |
| Mocks require `iUnderstandThisIsTestOnly` and refuse `NODE_ENV=production` | **Pass** |
| `test_only` allowlist entries gated | **Pass** |
| `assertReadyForRemoteInference` + TTL | **Pass** (5 min default) |
| Required fail-closed tests from bar §5 | **Pass** (see EVIDENCE_ITEM2.md table) |

## Accepted residuals (blocking live remote / Phase 2 completions — not reopen of item 2)
1. **No real DCAP / gateway / GPU verifiers plugged** — intentional; production remote stays DENY until real plugs + Privacy Security–approved allowlist entries (non-`test_only`).
2. **`report_data` layout** (ecdsa vs ed25519) still TODO vs NEAR docs — confirm before trusting live quotes.
3. **`provider_tee` response-signature binding** deferred to Phase 2 completions path — **must** land before any remote completion is considered verified.
4. **TCB/advisory policy** currently fail-closed (`UpToDate` only, empty advisory allowlist) — finalize with Privacy Security before production allowlist sign-off.
5. **DESIGN.md** claims allowlist “exactly one match or DENY”; code correctly allows multiple exact-matching release entries and takes the first. Fix DESIGN wording (non-blocking).
6. **Missing unit test** that `SKIP_ATTEST=1` refuses construction — impl present; add test (non-blocking).

## Phase 1.5 / Phase 2 posture
- Items **(1)(2)(3)(4)(5)** are now all signed off at the stub/criteria level.
- **Phase 2 remains blocked** by: (a) R3 near-echo delta 7B re-green + Privacy Security delta-only re-check; (b) real verifier plugs + approved allowlist before live remote; (c) `provider_tee` response binding on the completions path.
- **No Phase 2 / no waive.**
