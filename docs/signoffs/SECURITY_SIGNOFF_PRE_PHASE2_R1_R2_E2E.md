# Sign-off — Pre–Phase-2 R1 + R2 + item (7) completions E2E skeleton
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Bar:** `../acceptance/PRE_PHASE2_ACCEPTANCE.md` §A/§C; required follow-ups in `SECURITY_SIGNOFF_PRE_PHASE2_REAL_PLUGS.md`  
**Evidence:** `phase1.5-attestation/EVIDENCE_PRE_PHASE2_COMPLETIONS_E2E.md`  
**Recomputed:** `npm test` → **74/74**; `tsc --noEmit` clean.  
**Allowlist:** still `{ "entries": [] }` ⇒ deny-all.

## Decision
**SIGNED OFF** for:
- **R1** NRAS body-JWT claim path (header ignored)
- **R2** prod guard allowlist-only (`WIRED_PLUG_NAMES`)
- **Item (7)** `VerifiedCompletionClient` E2E **skeleton** (mock fetch; fail-closed bind)

Does **not** authorize verified remote, populate allowlist, or open Phase 2.

## Checklist

| Item | Verdict | Notes |
|------|---------|-------|
| **R1** | **Pass** | `nrasBodyOverallResult`: `[["JWT", jwt],…]` → boolean claim `=== true`; string `"true"` / false / missing / malformed / no JWT deny; tests show header=`true` does not pass. Matches NEAR docs **minimal** TLS-to-NRAS flow. |
| **R2** | **Pass** | `assertPlugsProductionReady` requires `WIRED_PLUG_NAMES.has(name)`; `totally-trusted` denied by test. |
| **(7)** | **Pass (skeleton)** | assertReady → POST completions (canonical model, `x-no-aliasing`, `accept-encoding: identity`) → exact-byte hashes → GET signature (404 retry ≤3) → `assertBoundCompletion`. Sanitizer orchestrator-owned. Digest log `completion_bind` content-free. Required §C deny cases covered in 12 tests. |

## Residuals (non-blocking for this milestone; blocking for verified remote)

| # | Residual |
|---|----------|
| **J1** | Prefer NVIDIA **JWT/JWKS (or EAT) verify** before trusting GPU in prod (NEAR docs call this optional; we want it before live GPU acceptance). |
| **F*** | Genuine TDX+collateral; real NEAR RTMR3 sample; real nvidia+NRAS sample; real `provider_tee` ecdsa sample (unchanged). |
| **(6)** | PS-approved non-`test_only` allowlist. |
| Soft | Drop stale header comment above `nrasBodyOverallResult`; refresh `DESIGN_PROVIDER_TEE.md` opener (still says binder stubbed); auto-default wired plugs when `productionPlugsRequired`. |

## Gate
**Phase 2 BLOCKED.** Empty allowlist deny-all. Item (7) skeleton ≠ live verified completions. No waive.

## Update (same day)
**J1 cleared** — see `SECURITY_SIGNOFF_PRE_PHASE2_J1_JWKS.md`. JWKS URL confirmed. Live GPU still needs J2 (x5c pin) + J3 (unknown-kid refetch).
