# phase1.5-attestation — fail-closed NEAR AI Cloud attestation verify (STUB)

**Remote inference is NOT wired.** This package only fetches + verifies `/v1/attestation/report` and gates readiness.
Default verifier always denies (`quote_verifier_not_configured`). **Privacy Security must sign off** (see DESIGN.md §7) before any Phase 2 use.

```bash
npm install
npm test          # vitest
npm run typecheck # tsc --noEmit
```

Env:
- `NEAR_AI_CLOUD_API_KEY` — only source of the key; never logged.
- `NEAR_ATTEST_ALLOWLIST_PATH` — optional; default `allowlist/measurements.json`.
- `SKIP_ATTEST` / `ALLOW_NO_ATTEST` — **banned**; client refuses to start if set.

Allowlist: `allowlist/measurements.json` ships as `{"entries":[]}`. **Empty (or missing) allowlist ⇒ deny-all remote.** Entries are PR-only with Privacy Security review; `test_only: true` entries never load in production or without `allowTestOnly: true`.
Gateway: `gateway_attestation` is mandatory and verified via a `GatewayVerifier` plug (stub denies). GPU: verify-if-present, `require_gpu` default false. Base URL defaults to `https://cloud-api.near.ai/v1`.

Usage (future Phase 2 caller):
```ts
const c = new AttestationClient({ quoteVerifier, gpuVerifier, gatewayVerifier, policy }); // production plugs
await c.verifyForModel(model);            // preflight; throws AttestationError on any failure
c.assertReadyForRemoteInference(model);   // call right before each completion
```
Entry: `src/index.ts` (client in `src/client.ts`, checks in `src/verify.ts`).
