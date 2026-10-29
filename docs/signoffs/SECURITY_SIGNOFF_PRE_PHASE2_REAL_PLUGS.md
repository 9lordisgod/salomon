# Sign-off — Pre–Phase-2 real plug wire-up (item 1)
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Bar:** `../acceptance/PRE_PHASE2_ACCEPTANCE.md` §A/§C + `SECURITY_SIGNOFF_PRE_PHASE2_STUBS.md` item 1 + hygiene residuals  
**Evidence:** `phase1.5-attestation/EVIDENCE_PRE_PHASE2_REAL_PLUGS.md`  
**Recomputed:** `npm test` → **60/60**; `tsc --noEmit` clean.  
**Allowlist:** still `{ "entries": [] }` ⇒ deny-all.

## Decision
**SIGNED OFF — wire-up milestone (code paths + deps), NOT verified-remote ready.**

Real plug classes and crypto binder are wired and fail-closed under unit tests. **Live / verified remote remains DENY** until required follow-ups below and items **6** / **7** clear. No Phase 2 / no waive.

## What passed

| Area | Verdict | Notes |
|------|---------|-------|
| `DcapQuoteVerifier` | **Pass (adapter)** | `@phala/dcap-qvl` `getCollateralAndVerify`; reject SGX + debug bit; extract fields; PCCS via option/env. Mapping tests mock collateral; real lib exercised on garbage quote → deny. |
| `DcapGatewayVerifier` | **Pass** | Reuses quote path; nonce + report_data + interim TCB; gateway alone never authorizes model. |
| `NobleResponseBinder` | **Pass (lab keys)** | Real EIP-191 recover (r‖s‖v 27/28, low-s) + ed25519; bindCompletion E2E + gateway-only deny. Encoding still needs a **real** NEAR `provider_tee` sample. |
| Hygiene residuals 1–5 | **Pass** | Non-string `nvidia_payload` always DENY; `assertBoundCompletion` reuses `assertPlugsProductionReady`; `unwired_plug` CheckName; DESIGN RTMR3 “recompute done”. |
| Deps / empty allowlist | **Pass** | `@phala/dcap-qvl`, `@noble/*` present; measurements.json empty (test asserts). |

## Required follow-ups (before any GPU / prod claim)

| # | Gap | Severity |
|---|-----|----------|
| **R1** | **NRAS verdict path wrong vs NEAR docs.** Docs: body is JSON array `["JWT", …]`; decode JWT payload; require claim `x-nvidia-overall-att-result === true` (boolean). Code/tests check **HTTP header** `x-nvidia-overall-att-result`. Fix parse + tests; header alone is not acceptance. | **Must-fix before GPU trust** |
| **R2** | **Prod guard is denylist, not allowlist.** Claim “only WIRED names pass” is overstated: any name without `stub`/`mock` passes (`totally-trusted` constructs). Enforce `WIRED_PLUG_NAMES` allowlist under production / `requireProductionPlugs`. | **Must-fix before prod claim** |
| **R3** | Genuine NEAR TDX quote + collateral fixture (offline `verify`) | Must before quote trust |
| **R4** | Captured NEAR report sample for live RTMR3 | Must before RTMR3 trust |
| **R5** | Real `nvidia_payload` + NRAS sample (after R1) | Must before GPU trust |
| **R6** | Real `provider_tee` ecdsa encoding sample | Must before binder trust on live path |
| **R7** | Item **6** PS allowlist; item **7** completions E2E | Still open |

## Non-blocking
- Prefer `AttestationClient` auto-default to `Dcap*` / `Nras*` / `NobleResponseBinder` when `productionPlugsRequired` (today: refuse stubs, caller must inject).
- `DESIGN_REAL_PLUGS.md` header still says “fail-closed stubs only” / lists `*_not_wired` — update status section.
- Dead code after always-deny non-string in `verify.ts` (second string check) — cleanup OK.

## Gate
**Phase 2 BLOCKED.** Wire-up ≠ verified remote. Empty allowlist still deny-all. Fix **R1–R2** in the next PR; land fixtures **R3–R6** before asking for verified-remote clearance.

## Update (same day)
**R1 + R2 cleared** — see `SECURITY_SIGNOFF_PRE_PHASE2_R1_R2_E2E.md`. Item (7) skeleton also signed; verified remote still blocked.
