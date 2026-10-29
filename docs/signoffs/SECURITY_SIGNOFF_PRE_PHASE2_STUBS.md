# Sign-off — Pre–Phase-2 design + fail-closed stubs
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Bar:** `../acceptance/PRE_PHASE2_ACCEPTANCE.md` (LOCKED)  
**Evidence:** `phase1.5-attestation/EVIDENCE_PRE_PHASE2_STUBS.md`  
**Recomputed:** `npm test` → **35/35** (attestation 16/16 + realPlugs 5 + responseBinding 14); `tsc --noEmit` clean.  
**Allowlist:** `allowlist/measurements.json` still `{ "entries": [] }` ⇒ deny-all.

## Decision
**SIGNED OFF — stub milestone only.**

Design docs + fail-closed stubs meet the locked bar for scaffolding. This does **not** authorize live remote inference, clear remaining wire-up work, populate the production allowlist, or open Phase 2.

## Checklist vs bar

| Section | Verdict | Notes |
|---------|---------|-------|
| **A** Real-plug design + fail-closed stubs | **Pass** | `DESIGN_REAL_PLUGS.md`; `DcapQuoteVerifier` / `DcapGatewayVerifier` / `NrasGpuVerifier` always deny (`*_not_wired`); no network; docs cite `@phala/dcap-qvl` + NRAS. Prod default remains `StubFailClosedVerifier`. GPU verify-if-present / `require_gpu=false` unchanged. TCB interim still UpToDate + empty advisories. |
| **B** Draft allowlist path | **Pass** | `allowlist/DRAFT_ALLOWLIST.md` + `allowlist/draft/` not loadable; evidence package listed; empty measurements.json confirmed by test. |
| **C** `provider_tee` binder | **Pass** | `DESIGN_PROVIDER_TEE.md` + `responseBinding.ts`: exact `MODEL_ID:req_hash:resp_hash`, unique model retain-set, gateway-only → DENY, stub binder → `response_binder_not_configured`. Required deny matrix covered in `responseBinding.test.ts` (incl. happy path via test_only binder, 0/>1 match, byte sensitivity, digest hygiene). |
| **D** `report_data` | **Pass** | `expectedReportData` enforces ecdsa=20B / ed25519=32B / nonce=32B; `signingAlgo` retained on `VerifiedAttestation`. |

## Explicitly still open (next PRs — not waived)
1. Wire real `@phala/dcap-qvl` + NRAS + EIP-191/ed25519 response binder; make them the **prod default**.
2. Refuse selection of unwired stubs / mocks under prod config (name `Dcap*` today is easy to misread as live — keep fail-closed until wired, then rename or gate).
3. RTMR3 recompute per NEAR docs (replace digest-trusting `replayRtmr` on real path).
4. Prefer hashing exact received `nvidia_payload` string (DESIGN already flags `JSON.stringify` fragility).
5. Hygiene: drop stale `TODO(Privacy Security): confirm ecdsa/ed25519 layout` comment above the LOCKED note in `verify.ts`.
6. PS-approved **non-`test_only`** allowlist entry (separate evidence package) before any verified remote.
7. Completions path that calls `assertReadyForRemoteInference` → completion → `assertBoundCompletion` end-to-end.

## Gate
**Phase 2 remains BLOCKED.** No waive. Live remote stays DENY until items 1–3 and 6 above are signed, plus `provider_tee` crypto binder wired and green under §C tests with a real binder (not only test_only).
