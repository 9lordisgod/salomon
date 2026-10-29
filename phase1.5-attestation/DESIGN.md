# Phase 1.5 item (2) — Fail-closed NEAR AI Cloud attestation verify client (design)

Bar: `../ATTESTATION_ACCEPTANCE.md` (locked by Privacy Security). Item (2) **not signed off**. No Phase 2 / no waive.
Scope: preflight gate only; no remote completions wired. Gateway path (`https://cloud-api.near.ai/v1`) only.

## Locked decisions (implemented)
1. **require_gpu = false (verify-if-present).** `policy.requireNvidiaEvidence` defaults to `false`. `nvidia_payload` present → GpuVerifier must pass or DENY. `require_gpu=true` + absent → DENY.
2. **Gateway attestation mandatory** in addition to non-empty, verified, allowlisted `model_attestations[]`. `GatewayVerifier` plug; default `StubFailClosedVerifier` → `gateway_verifier_not_configured`; missing → `gateway_attestation_missing`. Gateway alone never authorizes.
3. **Exact allowlist pins** from local file `allowlist/measurements.json` (ships `{ "entries": [] }` ⇒ deny-all). Match = exact `model_id` + (`mrconfigid` and/or `app_compose_sha256`) + `rtmr3`, optional exact ordered `event_log_digests[]`, optional `gpu_evidence_sha256`. Zero matches → DENY; multiple exact-matching release entries are allowed (code takes the first). Required fields: `effective_from`, `notes`, `privacy_security_approver`; optional `test_only`. `test_only` loads only if `allowTestOnly === true` AND `NODE_ENV !== "production"`. Missing/unreadable/malformed/empty → DENY (`allowlist_load`). PR-only updates, Privacy Security review; no network fetch.
4. **Digest-only logs.** `DigestLogger` closed type + runtime key allowlist; logs `nonceHash` (sha256 hex of nonce), never raw nonce; rejects prompt/messages/completion/content/apiKey/authorization keys and credential-looking values. Sealed evidence store: not implemented (default OFF).

## Flow (`AttestationClient.verifyForModel`)
banned SKIP flags check → load allowlist → fresh 32-byte nonce → `GET /v1/attestation/report` (model, provider=near, signing_algo=ecdsa, nonce, include_tls_fingerprint=false; `x-no-aliasing: true`) → `verifyReport`:
gateway present + GatewayVerifier ok → model_attestations non-empty → per candidate: request_nonce echo, DCAP QuoteVerifier + TCB/advisory policy, report_data binds signing_address+nonce, RTMR3 replay, MRCONFIGID = `01||sha256(app_compose)||0x00*15`, GPU verify-if-present, exact allowlist match. Any failure ⇒ whole report DENY + digest log.
`assertReadyForRemoteInference(model)` throws unless a fresh (≤5 min) non-empty verified set exists. Order for future callers: sanitizer → attest → completions (sanitizer lives outside this package).

## Plug points
`QuoteVerifier` (prod: dcap-qvl), `GpuVerifier` (NVIDIA NRAS/local), `GatewayVerifier`. All default to fail-closed stub. `MockQuoteVerifier` / `MockGatewayVerifier` require `iUnderstandThisIsTestOnly: true` and refuse `NODE_ENV=production`.

## Remaining open (not decided by bar)
- Exact `report_data` layout for ecdsa vs docs (TODO confirm).
- Final TCB status/advisory allowlist.
- Real DCAP/GPU/gateway verifier implementations; `provider_tee` response-signature matching (Phase 2 path).
