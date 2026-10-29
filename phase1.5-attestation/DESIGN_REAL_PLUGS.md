# Design — real attestation plugs (Pre–Phase-2)
**Bar:** [`../PRE_PHASE2_ACCEPTANCE.md`](../PRE_PHASE2_ACCEPTANCE.md) (LOCKED, Privacy Security) §A, §B, §D. **Status:** real plugs wired and PS-signed: wire-up + R1 (NRAS body-JWT) + R2 (`WIRED_PLUG_NAMES` allowlist guard) + item 7 E2E skeleton + J1 (JWKS ES384) + J2 (pinned x5c, leaf `O=NVIDIA Corporation`) + J3 (unknown-kid refetch) + `iss`. Stubs (`*-stub`, `*_not_wired`) are legacy non-prod only and blocked in prod. Remaining gate: PS allowlist (item 6) + genuine NEAR fixtures. No live remote, no Phase 2, no waive.

Plugs: `src/realPlugs.ts` — `DcapQuoteVerifier`, `DcapGatewayVerifier`, `NrasGpuVerifier` (acceptance = body JWT claim `x-nvidia-overall-att-result === true`; header ignored; J1 ES384 sig vs NVIDIA JWKS; J2 pinned x5c + leaf `O=NVIDIA Corporation`; J3 unknown-kid refetch; `iss` required). Prod guard is an **allowlist** (`WIRED_PLUG_NAMES`). Non-prod `AttestationClient` default stays `StubFailClosedVerifier`. When production plugs are required (`NODE_ENV=production` or `requireProductionPlugs: true`), omitted plugs **auto-wire** to the real Dcap/Nras/Noble instances (opt-out: `autoWireProductionPlugs: false`); result still passes `assertPlugsProductionReady`.

## 1. QuoteVerifier (TDX quote v4)
- `@phala/dcap-qvl` `getCollateralAndVerify(quote)`; collateral Phala PCCS or Intel PCS (`INTEL_PCS_URL`). Collateral unreachable/stale/CRL fail ⇒ DENY.
- Reject TDX debug (`td_attributes` bit 0).
- Extract `reportData`, `rtMr3`, `mrTd`, `mrConfigId`, TCB status, advisory ids into `VerifiedQuote`.
- TCB interim: `allowedTcbStatuses:["UpToDate"]`, `allowedAdvisoryIds:[]`; widening only via PS-reviewed PR.
- RTMR3 (real path fix): recompute each IMR3 event digest `SHA-384(event_type LE32 ‖ ":" ‖ event UTF-8 ‖ ":" ‖ hex-decoded payload)`, compare with provided `digest` when non-empty, then extend from 48 zero bytes. **Recompute done** (hygiene PR, PS-signed): `imr3EventDigest`/`recomputeImr3Digests`/`replayRtmr`. Captured NEAR report sample still needed before trusting live RTMR3.

## 2. report_data (§D, LOCKED, implemented)
`pad32(identity) ‖ nonce32`. `expectedReportData(addr, nonce, algo)` now enforces ecdsa = exactly 20B, ed25519 = exactly 32B, nonce = 32B; unsupported `signing_algo` ⇒ DENY. `VerifiedAttestation.signingAlgo` retained for provider_tee. TLS-binding mode out of scope for 1.5.

## 3. GatewayVerifier
Same dcap-qvl + report_data + RTMR3 + MRCONFIGID path on `gateway_attestation.intel_quote`; nonce must equal client nonce. Mandatory on gateway base; never authorizes model trust alone.

## 4. GpuVerifier
Verify-if-present (`require_gpu=false` default; true + absent ⇒ DENY). Present ⇒ decode JSON string → nonce match → NRAS `POST …/v3/attest/gpu` → body `["JWT", jwt]` → **J1** ES384 signature vs NVIDIA JWKS (`https://nras.attestation.nvidia.com/.well-known/jwks.json`, overridable, 10m TTL cache) → **J2** JWK must carry `x5c`; leaf SPKI must equal JWK `x`/`y`; leaf subject must carry exactly one `O=NVIDIA Corporation` (missing ⇒ `nras_jwks_x5c_leaf_org_missing`, wrong ⇒ `nras_jwks_x5c_leaf_org_mismatch`; live 212/212 leaves carry it); each link `checkIssued`+signature-verified up to a cert whose SPKI sha256 is in `NRAS_X5C_PINNED_SPKI_SHA256` (live Intermediates 004/005, issued by CA 001); every walked cert in validity; bare coords never trusted → **J3** unknown `kid` ⇒ exactly one forced cache-bust refetch, then DENY → claims: `exp` required, `nbf` honored, `iss === "https://nras.attestation.nvidia.com"` required (missing ⇒ DENY) → require `x-nvidia-overall-att-result === true`. Note: GPU evidence hashing must use the exact received string, not `JSON.stringify` of a parsed object (fragile).

## 5. Allowlist
Schema unchanged (`AllowlistEntry`). `measurements.json` = `{entries:[]}` ⇒ deny-all until PS-approved non-`test_only` PR. Drafts: `allowlist/DRAFT_*.md` only (not loaded). See `allowlist/DRAFT_ALLOWLIST.md`.

## 6. Remaining work before verified remote
Done & PS-signed: real plugs wired; stubs/mocks unselectable in prod (allowlist guard); J1–J3 + leaf O; production **autoWire** of real plugs when production plugs required (opt-out available). Open: (6) PS-approved non-`test_only` allowlist; genuine TDX+collateral fixture, real NEAR RTMR3 report, real nvidia_payload+NRAS JWT, real provider_tee ecdsa sample (happy path + tamper/expired-collateral/debug/TCB deny tests).

## Production guard (hygiene PR)
`src/productionGuard.ts`: `UNWIRED_PLUG_NAMES` + `assertPlugsProductionReady`. Enforced by `AttestationClient` (NODE_ENV=production or `requireProductionPlugs`) and `assertBoundCompletion` (NODE_ENV=production). Superseded by R2: prod accepts only `WIRED_PLUG_NAMES` (allowlist); stub names remain in `UNWIRED_PLUG_NAMES` for clear deny reasons.

## Wired (Pre-Phase-2 real plugs, 2026-10-29)
- `DcapQuoteVerifier` (name `dcap-quote-verifier`): `@phala/dcap-qvl@0.7.0` `getCollateralAndVerify` (pure JS). PCCS = Phala default; set `pccsUrl` or `NEAR_ATTEST_PCCS_URL` (e.g. dcap-qvl `INTEL_PCS_URL`) for Intel PCS. SGX/non-TDX ⇒ DENY; `td_attributes[0] & 1` (DEBUG) ⇒ DENY; any collateral/parse/network error ⇒ DENY. Maps reportData, rtmr0–3, mrTd, mrConfigId, status, advisory_ids. TCB/advisory policy still enforced in verify.ts.
- `DcapGatewayVerifier` (`dcap-gateway-verifier`): reuses QuoteVerifier on `gateway_attestation.intel_quote`; request_nonce echo; TCB UpToDate + no advisories; report_data = bound(signing_address)‖nonce. Gateway success never authorizes model trust.
- `NrasGpuVerifier` (`nras-gpu-verifier`): exact-string payload → JSON → nonce match → non-empty evidence_list → `POST https://nras.attestation.nvidia.com/v3/attest/gpu` (body = payload string as received; injectable `fetch`) → body `[["JWT", jwt], …]` (header ignored) → **J1** ES384 vs JWKS → **J2** pinned Intermediate 004/005 x5c + leaf SPKI=`x`/`y` + leaf `O=NVIDIA Corporation` → **J3** unknown-kid one cache-bust refetch → `iss`/`exp`/`nbf` → claim `x-nvidia-overall-att-result === true`.
- `NobleResponseBinder` (`noble-response-binder`, src/responseBinder.ts): see DESIGN_PROVIDER_TEE.md.
- Legacy stub names (`*-stub`) stay in `UNWIRED_PLUG_NAMES`; `WIRED_PLUG_NAMES` lists the four real names.

## G4 — compose-manager evidence required (CM required)
On the verified remote path `compose_manager_attestation` is mandatory. Absent/null ⇒ DENY check `compose_manager`, reason `compose_manager_missing`. Present ⇒ G1 verify (DCAP quote, `report_data === actions_hash ‖ request_nonce`, client nonce, TCB UpToDate/non-debug); any failure ⇒ DENY.
