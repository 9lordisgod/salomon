# Evidence — Pre-Phase-2 real plugs wire-up (2026-10-29)
Against PRE_PHASE2_ACCEPTANCE.md §A/§C. **Not** Phase 2; no waive; allowlist `{entries:[]}` (deny-all, test asserts).

## Results
- `npm test`: **60/60** (3 files). `tsc --noEmit`: clean.
- Deps added (runtime): `@phala/dcap-qvl@^0.7.0` (pure JS, installs cleanly, no native binding), `@noble/secp256k1@^3.2.0`, `@noble/ed25519@^3.2.0`, `@noble/hashes@^2.4.0`. No secrets in repo; no skip flags.

## Shipped
- DcapQuoteVerifier / DcapGatewayVerifier / NrasGpuVerifier now real (src/realPlugs.ts); NobleResponseBinder (src/responseBinder.ts).
- productionGuard: real names `dcap-quote-verifier`, `dcap-gateway-verifier`, `nras-gpu-verifier`, `noble-response-binder` pass `assertPlugsProductionReady` (`WIRED_PLUG_NAMES`); stub/mock/legacy `*-stub` names still forbidden. New CheckName `unwired_plug`.
- PS hygiene residuals: (1) non-string `nvidia_payload` always DENY in verify.ts; (2) `assertBoundCompletion` reuses `assertPlugsProductionReady` (bindOnly); (3) `unwired_plug` CheckName; (4) DESIGN_REAL_PLUGS §1 RTMR3 drift fixed.
- Test behavior change: prod-guard test now expects first failure at `responseBinder` (Dcap* no longer stubs).

## Tests added
dcap adapter: TD10/TD15 mapping, debug-bit reject, collateral failure, SGX/bad hex, real dcap-qvl on garbage quote ⇒ deny. Gateway: pass, nonce/report_data/TCB deny. NRAS (mocked fetch): true pass, false/HTTP/network deny, nonce + non-string deny without network. Binder: EIP-191 ok / wrong sig / wrong text, ed25519 ok / wrong key, bindCompletion E2E ok + gateway-only deny. Guard: real pass, stubs fail, AttestationClient requireProductionPlugs with real plugs constructs.

## Mocked vs live
- `getCollateralAndVerify` mocked in mapping tests — **no genuine TDX quote fixture** (PS gap). Real library exercised only on a garbage quote (deny path).
- NRAS HTTP fully mocked; no live NRAS call. No live NEAR Cloud soak.
- Crypto binder is real (keys generated in-test).

## Open gaps for PS
1. Recorded genuine NEAR TDX quote + collateral fixture (offline replay via dcap-qvl `verify(quote, collateral, ts)`).
2. Captured real NEAR report sample before trusting live RTMR3 replay.
3. Recorded NRAS response / real nvidia_payload sample; confirm NEAR payload shape (`nonce`, `evidence_list`, `arch`).
4. Confirm NEAR provider_tee ecdsa signature encoding (r‖s‖v, v=27/28) on a real sample.
5. PS-approved non-test_only allowlist (item 6); completions E2E (item 7) — `VerifiedCompletionClient` not added.
