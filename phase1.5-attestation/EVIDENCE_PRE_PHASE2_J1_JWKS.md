# Evidence — Pre-Phase-2 J1 (NVIDIA NRAS JWT/JWKS verify) + soft hygiene
**Bar:** `../PRE_PHASE2_ACCEPTANCE.md` + PS note in `SECURITY_SIGNOFF_PRE_PHASE2_R1_R2_E2E.md`. Date 2026-10-29. R1/R2/(7) not reopened. Allowlist unchanged `{entries:[]}` (deny-all). No Phase 2 / waive / live soak. No fixtures or pins invented.

## Results
- `npm test`: **76/76** pass (was 74; +2 J1 tests, R1/NRAS tests migrated to signed JWTs + test JWKS — no bypass).
- `tsc --noEmit`: clean.

## J1 implementation (`src/realPlugs.ts`)
- `verifyNrasJwt(jwt, {jwksFetch, jwksUrl?, now?})` → node:crypto ES384 (P-384, ieee-p1363 96-byte sig) over `header.payload`, key selected by `kid` from JWKS.
- `nrasBodyOverallResult` is now async and requires a JWKS-verified JWT before reading claim `x-nvidia-overall-att-result === true` (header still ignored).
- `NrasGpuVerifier({fetch, url, jwksFetch?, jwksUrl?, now?})`; JWKS fetch wrapped in `cachedJwksFetch` (TTL 10 min).
- Deny codes: `nras_jwt_malformed`, `nras_jwt_alg_rejected` (only ES384; `none`/HS*/unsigned legacy blobs rejected), `nras_jwt_kid_missing`, `nras_jwks_unavailable` (fetch throw/HTTP≠2xx/empty), `nras_jwks_kid_not_found` (0 or >1 matches), `nras_jwks_key_invalid` (non EC P-384), `nras_jwt_bad_signature` (wrong key/tampered), `nras_jwt_exp_missing`, `nras_jwt_expired`, `nras_jwt_not_yet_valid`, then `nras_overall_result_false`.
- Exports: `NRAS_JWKS_URL`, `NRAS_ALLOWED_ALGS`, `verifyNrasJwt`, `nrasBodyOverallResult`, `cachedJwksFetch`, `Jwk`, `JwksFetch`.

## JWKS URL — confidence
`https://nras.attestation.nvidia.com/.well-known/jwks.json`. Live-probed from box 2026-10-29 08:45 PDT: returns `{"keys":[{"kty":"EC","crv":"P-384","kid":"nv-eat-kid-prod-…","x5c":[…NVIDIA Attestation Service GPU Intermediate…]}]}` — consistent with ES384 + kid selection. Same host as NRAS `/v3/attest/gpu`. NEAR docs page did not name a JWKS URL. **Confidence: high on endpoint/alg, but marked UNCONFIRMED PENDING PS** (not cited from NVIDIA/NEAR prose docs). Not yet done: x5c chain validation to NVIDIA root (optional hardening; JWKS over TLS from nvidia.com is the trust anchor today). Key rotation is short-lived (cert validity ~12h) ⇒ TTL cache 10 min; unknown kid ⇒ deny (no forced refetch — possible follow-up).

## Tests (`test/realPlugs.test.ts`)
Local P-384 keypair + JWKS containing its public JWK. Happy path; unsigned legacy blob; wrong key; tampered payload; alg none/HS256; missing kid; unknown kid; duplicate kid; wrong curve; missing exp; expired; nbf future; JWKS throw; empty JWKS; cache TTL.

## Soft hygiene
1. Stale "JWT signature check is a follow-up" + header-check doc comments above `nrasBodyOverallResult` replaced with current J1 description.
2. `DESIGN_PROVIDER_TEE.md` opener refreshed (Noble binder + VerifiedCompletionClient signed; still not verified-remote ready).
3. **autoWire added** (`src/client.ts`): `autoWireProductionPlugs` (default on only when prod plugs required) fills omitted plugs with Dcap/DcapGateway/Nras/Noble; explicit plugs untouched; still `assertPlugsProductionReady`. `false` ⇒ previous throw behavior. Tests in `attestation.test.ts`. README documented.

## Still blocking verified remote (unchanged)
(6) PS-approved allowlist; genuine TDX+collateral; real NEAR RTMR3 sample; real nvidia_payload+NRAS sample (will also exercise live JWKS); real provider_tee ecdsa sample.
