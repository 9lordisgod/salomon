# Design — `provider_tee` response-signature binding
**Bar:** [`../PRE_PHASE2_ACCEPTANCE.md`](../PRE_PHASE2_ACCEPTANCE.md) §C (LOCKED). **Status (2026-10-29):** binding logic + real `NobleResponseBinder` (EIP-191 ecdsa / ed25519) wired and PS-signed; `VerifiedCompletionClient` E2E skeleton (assertReady → completion → signature retry → `assertBoundCompletion`) PS-signed as skeleton. `StubFailClosedResponseBinder` remains the non-prod default and is refused in prod. **Not verified-remote ready:** still needs a real provider_tee ecdsa sample, genuine NEAR fixtures, and PS-approved allowlist (repo allowlist empty ⇒ deny-all).

## Flow
1. `assertReadyForRemoteInference(model)` → retained `VerifiedAttestation[]` (signingAddress + signingAlgo). Without it, no completion.
2. Completion with canonical model id + `x-no-aliasing: true`; keep exact request/response bytes (`Accept-Encoding: identity`).
3. `GET /v1/signature/<chat_id>?signing_algo=<preflight algo>` (bounded 404 retry; exhausted ⇒ `signature: null`).
4. `bindCompletion(verified, evidence, binder)` / `assertBoundCompletion(...)` in `src/responseBinding.ts`.

## Checks (all deny codes)
`no_verified_attestation`, `missing_x_no_aliasing`, `model_id_mismatch`, `signature_missing` (null/error_code/empty), `gateway_signature_only`, `signature_kind_unrecognized`, `signing_algo_mismatch`, `signed_text_mismatch` (text ≠ `MODEL_ID:sha256(req):sha256(resp)`), `signer_match_none`, `signer_match_ambiguous` (>1), `response_binder_not_configured`.

## Crypto plug `ResponseSignatureBinder.verify(text, sig, address, algo)`
ecdsa = EIP-191 recover → compare address; ed25519 = verify UTF-8 text with address as pubkey; other ⇒ DENY. Default `StubFailClosedResponseBinder` always denies. Real binder (e.g. ethers/noble) is the next milestone.

## Logging
`BindingDigest` only: model id, algo, request/response hashes, signer sha256, reason. Never bodies, prompt, key, or raw signature.

## Real binder wired (2026-10-29)
`NobleResponseBinder` (`@noble/secp256k1` + `@noble/ed25519` + `@noble/hashes`): ecdsa = 65-byte r‖s‖v (v 0/1/27/28), low-s required, EIP-191 digest `keccak256("\x19Ethereum Signed Message:\n"+len+text)`, recovered eth address must equal signing_address. ed25519 = 64-byte sig verified over UTF-8 text with signing_address as 32-byte pubkey. `assertBoundCompletion` now reuses `assertPlugsProductionReady` (bindOnly) under prod / requireProductionPlugs.

## Completions E2E skeleton (item 7) — `src/verifiedCompletion.ts`
`VerifiedCompletionClient({ attestation, binder, baseUrl?, fetch, signatureAttempts?, signatureRetryDelayMs?, sleep?, logger? })`.
1. **Sanitizer is NOT inside** — orchestrator sanitizes before `complete()`.
2. `assertReadyForRemoteInference(model)` → retained set (gateway verified inside attest). Empty/throw ⇒ `no_verified_attestation`, no network. Mixed algos ⇒ `signing_algo_ambiguous`.
3. POST `<base>/v1/chat/completions` (default `https://cloud-api.near.ai`), `model` forced canonical, `x-no-aliasing: true`, `accept-encoding: identity`. Request bytes = bytes sent; response bytes = raw body (arrayBuffer/text), never re-serialized.
4. `chat_id` = response `id` (NEAR docs), fallback `chat_id`; missing/invalid ⇒ `chat_id_missing`.
5. GET `/v1/signature/<chat_id>?signing_algo=<preflight algo>`; 404 retried, default 3 attempts × 500ms (injectable, capped 5); non-404/non-200/exhausted ⇒ `signature_missing`.
6. `assertBoundCompletion` (provider_tee policy). Content returned (`verified: true`) only after bind passes; every deny throws `ResponseBindingError`.
Logs: `completion_bind` digest records (model, hashes, algo, signer sha256, reason) — no content.
