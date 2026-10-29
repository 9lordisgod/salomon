# Sign-off — Pre–Phase-2 hygiene PR (items 2–5)
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Bar:** `PRE_PHASE2_ACCEPTANCE.md` + follow-ups in `SECURITY_SIGNOFF_PRE_PHASE2_STUBS.md`  
**Evidence:** `phase1.5-attestation/EVIDENCE_PRE_PHASE2_HYGIENE.md`  
**Recomputed:** `npm test` → **45/45**; `tsc --noEmit` clean.  
**Allowlist:** still `{ "entries": [] }` ⇒ deny-all.

## Decision
**SIGNED OFF — hygiene milestone only.**

Clears stub-signoff follow-ups **2, 3, 4, 5**. Does **not** authorize live remote, clear items **1 / 6 / 7**, or open Phase 2.

## Checklist

| Item | Verdict | Notes |
|------|---------|-------|
| **2** Prod stub/mock block | **Pass** | `productionGuard.ts` + `AttestationClient` refuse Stub/Mock/unwired Dcap*/Nras* + missing/stub binder when `NODE_ENV=production` or `requireProductionPlugs`. Tests cover defaults, Dcap/Nras, mocks, binder slot, non-prod still constructs. |
| **3** RTMR3 recompute | **Pass** | `imr3EventDigest` / `recomputeImr3Digests` / `replayRtmr` match NEAR docs (LE32‖":"‖event‖":"‖payload); mismatch DENY; empty digest uses recomputed; allowlist digests use recomputed. Fail-closed on missing event_type/event / bad hex. **Residual:** fixtures are synthetic — need a captured NEAR report sample before trusting live RTMR3. |
| **4** GPU exact-string hash | **Pass** | SHA-256 of UTF-8 string as received; re-stringified pin fails; object + GPU pin → DENY; no `JSON.stringify` pin path. |
| **5** Stale TODO | **Pass** | report_data TODO above LOCKED §D comment removed. |

## Non-blocking residuals (next wire-up OK)
1. Prefer **always** DENY non-string `nvidia_payload` (even when no GPU pin), so the verify path never accepts a parsed object.
2. `assertBoundCompletion` prod check should reuse `assertPlugsProductionReady` / the shared `unwired()` helper (today it only special-cases the stub binder name + `NODE_ENV`).
3. Consider a dedicated `CheckName` for `unwired_plug_forbidden_in_production` instead of recycling `evidence_present` (clarity only).

## Still open (unchanged)
1. Real `@phala/dcap-qvl` + NRAS + EIP-191/ed25519 binder as prod default  
6. PS-approved non-`test_only` allowlist  
7. Completions E2E: `assertReady` → completion → `assertBoundCompletion`

**Phase 2 remains BLOCKED. No waive.**
