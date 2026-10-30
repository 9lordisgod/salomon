# phase1.5-attestation — fail-closed NEAR AI Cloud attestation verify (STUB)

**Remote inference is NOT wired.** This package only fetches + verifies `/v1/attestation/report` and gates readiness.
Default verifier always denies (`quote_verifier_not_configured`). **Privacy Security must sign off** (see DESIGN.md §7) before any Phase 2 use.

```bash
npm install
npm test          # vitest
npm run typecheck # tsc --noEmit
```

Env:
- `ATTEST_API_KEY` — only source of the key; never logged.
- `ATTEST_ALLOWLIST_PATH` — optional; default `allowlist/measurements.json`.
- `SKIP_ATTEST` / `ALLOW_NO_ATTEST` — **banned**; client refuses to start if set.

Allowlist: `allowlist/measurements.json` ships as `{"entries":[]}`. **Empty (or missing) allowlist ⇒ deny-all remote.** Entries are PR-only with Privacy Security review; `test_only: true` entries never load in production or without `allowTestOnly: true`.
Gateway: `gateway_attestation` is mandatory and verified via a `GatewayVerifier` plug (stub denies). GPU: verify-if-present, `require_gpu` default false. Base URL defaults to the provider TEE host (`ATTEST_API_BASE_V1`).

Usage (future Phase 2 caller):
```ts
const c = new AttestationClient({ quoteVerifier, gpuVerifier, gatewayVerifier, policy }); // production plugs
await c.verifyForModel(model);            // preflight; throws AttestationError on any failure
c.assertReadyForRemoteInference(model);   // call right before each completion
```
Entry: `src/index.ts` (client in `src/client.ts`, checks in `src/verify.ts`).

## Pre–Phase-2 (fail-closed stubs pending PS sign-off)
Bar: [`../PRE_PHASE2_ACCEPTANCE.md`](../PRE_PHASE2_ACCEPTANCE.md) (LOCKED). Design: [DESIGN_REAL_PLUGS.md](DESIGN_REAL_PLUGS.md), [DESIGN_PROVIDER_TEE.md](DESIGN_PROVIDER_TEE.md), [allowlist/DRAFT_ALLOWLIST.md](allowlist/DRAFT_ALLOWLIST.md). Evidence: [EVIDENCE_PRE_PHASE2_STUBS.md](EVIDENCE_PRE_PHASE2_STUBS.md). Real plug + response-binder stubs always deny.

## Production plug guard (Pre–Phase-2 hygiene)
When `NODE_ENV==="production"` or `requireProductionPlugs: true`, `AttestationClient` calls `assertPlugsProductionReady` and throws `unwired_plug_forbidden_in_production` if any quote/GPU/gateway plug or the `responseBinder` is missing (default stub), `StubFailClosed*`, `Mock*`, or the unwired `DcapQuoteVerifier`/`DcapGatewayVerifier`/`NrasGpuVerifier`. `assertBoundCompletion` likewise refuses a missing/stub binder under production. Non-prod default stays StubFailClosed (deny). Since no real plug is wired yet, **production construction always throws** — intended.

RTMR3 is replayed per NEAR docs (each IMR3 digest recomputed; provided non-empty digest must match). `gpu_evidence_sha256` = SHA-256 of the exact received `nvidia_payload` string; an object payload cannot satisfy a GPU pin (fail closed).

## Production plugs (wired, pending PS sign-off on genuine fixtures)
```ts
const qv = new DcapQuoteVerifier({ pccsUrl: process.env.ATTEST_PCCS_URL });
const client = new AttestationClient({ requireProductionPlugs: true, quoteVerifier: qv,
  gatewayVerifier: new DcapGatewayVerifier(qv), gpuVerifier: new NrasGpuVerifier(), responseBinder: new NobleResponseBinder() });
// then: verifyForModel → assertReadyForRemoteInference → completion → assertBoundCompletion(set, ev, binder)
```
Non-prod default remains StubFailClosed (deny). Empty allowlist ⇒ deny-all regardless of plugs.

## Verified completions (Pre–Phase-2 item 7, skeleton)
`VerifiedCompletionClient` runs assertReady → completion (`x-no-aliasing`, exact bytes) → `/v1/signature/<id>` (bounded 404 retry) → `assertBoundCompletion`. Fail-closed; caller owns sanitizer. Mock-fetch tests only; no live Cloud green path. See `DESIGN_PROVIDER_TEE.md`.

## Production auto-wire (J1 milestone)
When production plugs are required (`NODE_ENV=production` or `requireProductionPlugs: true`), `AttestationClient` fills any **omitted** plug with the real wired one: `DcapQuoteVerifier`, `DcapGatewayVerifier` (sharing that quote verifier), `NrasGpuVerifier` (JWKS-verified), `NobleResponseBinder`. Explicitly passed plugs are never replaced, and the result is still checked by `assertPlugsProductionReady` (explicit stubs/mocks still throw). Opt out with `autoWireProductionPlugs: false` (then omitted plugs ⇒ throw, as before). Non-prod: no auto-wire; defaults stay `StubFailClosed*`. Auto-wire does not touch the allowlist — empty ⇒ deny-all.

## NRAS JWT verification (J1)
`NrasGpuVerifier` verifies the NRAS body JWT (`[["JWT", jwt], …]`) against NVIDIA JWKS **before** reading `x-nvidia-overall-att-result`: alg must be `ES384`, `kid` must match exactly one EC P-384 key, `exp` required and unexpired, `nbf` honored (60s skew). Default JWKS URL `NRAS_JWKS_URL = https://nras.attestation.nvidia.com/.well-known/jwks.json` (override `jwksUrl`; inject `jwksFetch` for tests; 10-min TTL cache). Any JWKS/network/signature failure ⇒ DENY. No bypass flag exists.
