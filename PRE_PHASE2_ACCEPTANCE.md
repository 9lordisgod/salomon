# Pre–Phase-2 acceptance — real plugs, draft allowlist, `provider_tee`, `report_data`
**Status:** LOCKED BAR — stub milestone SIGNED OFF (`SECURITY_SIGNOFF_PRE_PHASE2_STUBS.md`); live wire-up still open  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Owners:** Privacy Security (bar + sign-off). Agent Engineer (implement).  
**Parent:** `ATTESTATION_ACCEPTANCE.md` (still in force). Item (2) stub already signed; this bar covers remaining Phase 2 blockers (b)+(c).  
**Gate:** Required before any live remote completion is treated as verified. **No Phase 2 / no waive.** R3 near-echo delta already CLEARED.

Sources: NEAR docs — [Quote/Nonce/Signer](https://docs.near.ai/cloud/verification/reference/quote-nonce-signer), [Response signatures](https://docs.near.ai/cloud/verification/cloud-api/response-signatures), [Model attestations](https://docs.near.ai/cloud/verification/cloud-api/model-attestations). Repo: `phase1.5-attestation/` DESIGN + types.

---

## A. Real plugs — what “real” means vs still-stub

### Still-stub (NOT acceptance for live remote)
- Default `StubFailClosedVerifier` / `quote_verifier_not_configured` / `gateway_verifier_not_configured`
- Any `Mock*` verifier (tests only; `iUnderstandThisIsTestOnly` + refuse `NODE_ENV=production`)
- Empty / `test_only`-only allowlist under prod config
- Any `SKIP_ATTEST` / `ALLOW_NO_ATTEST` / `NEAR_SKIP_ATTEST` / `ATTEST_SKIP` (construction must refuse — already enforced)

### Real = production plugs (all required before verified remote)
| Plug | Required implementation | Fail-closed |
|------|-------------------------|-------------|
| **QuoteVerifier** | Intel TDX quote verify via **`@phala/dcap-qvl`** `getCollateralAndVerify` (or Intel PCS via same package’s `INTEL_PCS_URL`). Extract `reportData`, `rtMr3`, `mrConfigId`, TCB status, advisories from verified quote. **Reject TDX debug mode** (`td_attributes` bit 0 set). | Missing plug, verify fail, bad TCB/advisory → DENY |
| **GatewayVerifier** | Same quote+binding path on `gateway_attestation` (mandatory on gateway base). Gateway alone never authorizes model trust. | Missing/fail → DENY |
| **GpuVerifier** | **Verify-if-present** (locked Decision 1; `require_gpu=false` default). If `nvidia_payload` present → decode JSON string → nonce match → NVIDIA NRAS `POST …/v3/attest/gpu` per NEAR docs; require `x-nvidia-overall-att-result === true`. If `require_gpu=true` and payload absent → DENY. | Present+fail or require+absent → DENY |

### Allowed libraries / APIs
- **Allowed:** `@phala/dcap-qvl` (Node), collateral from Phala PCCS or Intel PCS; NVIDIA NRAS HTTPS for GPU when payload present; NEAR AI Cloud gateway `https://cloud-api.near.ai/v1` only (item (2) scope).
- **Disallowed:** inventing quote trust without DCAP; trusting HTTP fields without verified quote; fetching allowlist over the network; honoring skip-attest flags; treating gateway attestation as model trust; post-hoc attestation after completion.

### TCB / advisory (interim — finalize before first non-`test_only` allowlist entry)
- Keep `allowedTcbStatuses: ["UpToDate"]`, `allowedAdvisoryIds: []` (any advisory → DENY) until Privacy Security explicitly widens in a reviewed PR.
- Do **not** ship a looser TCB set inside the plug PR without PS approval.

### Sign-off for plugs
AE delivers design + stub→real wiring + unit/integration tests (happy path may use recorded fixtures; live Cloud soak still non-goal for 1.5). PS signs when: real verifiers are the prod default path, stubs cannot be selected in prod config, required fail-closed tests green, evidence note with test output + paths.

---

## B. Draft allowlist path

### Locked schema (unchanged — `AllowlistEntry`)
Required: `model_id`, `rtmr3`, `effective_from` (ISO), `notes`, `privacy_security_approver`.  
At least one of: `mrconfigid` (48-byte hex) **or** `app_compose_sha256`.  
Optional: exact ordered `event_log_digests[]`, `gpu_evidence_sha256`.  
Optional: `test_only: true` (loads only if `allowTestOnly === true` **and** `NODE_ENV !== "production"`).

Match = exact pins. Zero matches → DENY; multiple exact matches → take-first (OK). Missing/unreadable/malformed/empty file → DENY (`allowlist_load`).

### Empty stays deny-all until PS-approved
- Repo `allowlist/measurements.json` ships / remains `{ "entries": [] }` until Privacy Security approves ≥1 **non-`test_only`** entry with a real `privacy_security_approver` value naming Privacy Security (or Lead-delegated PS id).
- **Confirmed:** empty ⇒ deny-all remote. Drafts must **not** populate production entries with placeholder approvers that would load.

### Where drafts live
- Prefer `phase1.5-attestation/allowlist/DRAFT_<model_slug>.md` (or PR description) — **not** loaded by the client.
- Production `measurements.json` changes are **PR-only** and require Privacy Security review/approval before merge.

### Evidence package PS needs to approve a pin set
1. Canonical `model_id` (no alias).
2. Measured pins: `mrconfigid`, `app_compose_sha256`, `rtmr3`; optional `event_log_digests[]`, `gpu_evidence_sha256`.
3. How obtained (gateway path, UTC time, tooling); **digest-only** proof of successful quote verify (quote sha256, TCB status, advisory list) — **no** raw quote blobs in chat/logs.
4. Short human review of compose/image (“what code/config this measurement represents”).
5. Proposed `effective_from` + `notes` (why trusted / residual risk).
6. Explicit request for PS to set `privacy_security_approver` and merge.

`test_only` fixtures are fine for CI; they never count as production allowlist clearance.

---

## C. `provider_tee` response-signature binding

**Policy:** A remote completion is **verified** only if preflight retain-set is non-empty **and** a `provider_tee` signature uniquely binds that completion to exactly one retained verified **model** report. Gateway-only signature ⇒ **UNVERIFIED / DENY** for our verified-remote path (gateway proves gateway bytes, not model TEE).

### Ordering
1. Sanitizer (orchestrator) → attest preflight → retain verified model candidates (+ verified gateway).
2. Completions with **canonical** model id + `x-no-aliasing: true`; retain **exact** request-body bytes and **exact** response-body bytes (no re-serialize; `Accept-Encoding: identity` or hash after decompress).
3. Fetch `GET /v1/signature/<chat_id>?signing_algo=<same as attestation>` (explicit algo; do not rely on defaults).
4. Verify signature; bind; only then treat as verified.

### What is signed (`provider_tee`)
```
text = "<MODEL_ID>:<request_hash>:<response_hash>"
request_hash  = SHA-256(exact request-body bytes)
response_hash = SHA-256(exact response-body bytes)
```
`MODEL_ID` = canonical id from the **original** request (not a post-hoc alias rewrite).

### Crypto check
| `signing_algo` | Verify |
|----------------|--------|
| `ecdsa` | Recover Ethereum **EIP-191** signer from `text` + `signature`; compare to retained `signing_address` |
| `ed25519` | Verify UTF-8 bytes of `text` using `signing_address` as Ed25519 public key |
| other | DENY |

Always compare **both** `signing_address` and `signing_algo`. Same algo as attestation preflight.

### Fail-closed (any → UNVERIFIED / DENY; no silent accept)
- Signature missing / `error_code` body / exhausted bounded 404 retry
- `signature_kind` absent, unfamiliar, or **`gateway`** when model binding is required (our default)
- Expected `text` mismatch
- Crypto verify fail
- **0 or >1** retained verified model reports match signer+algo
- Completions attempted without retain set / without `assertReadyForRemoteInference`
- Post-hoc attestation report used in place of preflight retain set
- Alias / missing `x-no-aliasing: true`

### Required tests (before PS sign-off)
- Happy path: unique `provider_tee` match → verified
- 0 match → DENY; 2 matches → DENY
- `gateway` kind only → DENY under verified-remote policy
- Wrong `text` / wrong algo / address mismatch → DENY
- Missing signature after bounded retry → DENY
- Exact-byte hash sensitivity (whitespace / re-serialize) → DENY

### Logging
Digest-only: model id, algo, request/response hashes, signer address digest, pass/fail, reason code. Never prompt/completion/API key/raw signature blobs in metrics labels.

---

## D. `report_data` layout (LOCKED vs NEAR docs)

Closes DESIGN TODO. Applies to NEAR-operated dstack quotes (`include_tls_fingerprint=false` is our default).

**64 bytes total:**
```
report_data = bound_identity (32 bytes) || client_nonce (32 bytes)
```

| Mode | `bound_identity` |
|------|------------------|
| **No TLS binding** (default; `include_tls_fingerprint=false`) | Decoded `signing_address` hex (strip `0x`), **right-padded with zeros to 32 bytes**. `ecdsa` → 20-byte address; `ed25519` → 32-byte public key (no pad). |
| TLS binding (`include_tls_fingerprint=true`) | `SHA-256(decoded_identity \|\| decoded_tls_cert_fingerprint)` where fingerprint is raw 32-byte SPKI SHA-256 (not hex text). Must match peer cert on same TLS connection. **Out of scope for 1.5 default path** — if AE enables TLS binding later, peer compare is mandatory. |

Also required (unchanged parent bar):
- HTTP `request_nonce` must equal client nonce
- Quote `report_data` must equal expected layout above
- Compare identity **with** `signing_algo`; never cross-algo

**Implementation note for real plugs — RTMR3:** NEAR docs require **recomputing** each IMR3 event digest as `SHA-384(event_type LE32 || ":" || event UTF-8 || ":" || hex-decoded event_payload)`, checking against provided `digest` when non-empty, then `RTMR3 = SHA-384(RTMR3 || digest)` from 48 zero bytes. Align the real path with that (stub may currently trust `digest` alone — fix when plugging).

Current `expectedReportData()` (address right-pad ‖ nonce) matches the **no-TLS** lock — keep it; add ed25519 length check (must be exactly 32 bytes) and ecdsa length check (exactly 20 bytes) if not already strict.

---

## Accept / reject summary for AE

| Ask | Verdict |
|-----|---------|
| A Real DCAP + gateway + GPU verify-if-present; fail-closed | **ACCEPT / LOCKED** as above |
| B Empty `{entries:[]}` deny-all until PS-approved; drafts outside loadable file | **CONFIRM** |
| C `provider_tee` unique retain-set bind; gateway-only insufficient | **LOCKED** |
| D `report_data` = pad(identity)‖nonce (no TLS default) | **LOCKED** to NEAR docs |

## Out of scope (still deferred)
- Live Cloud soak / sealed evidence warehouse
- Direct `{slug}.completions.near.ai` (non-gateway) as green path
- Widening TCB/advisory without PS PR
- Phase 2 product features beyond verified remote completions plumbing

## Sign-off rule
Privacy Security signs each milestone when AE requests review with design path + evidence (tests + digests). Plugs and `provider_tee` may ship as separate PRs; **both** must be signed before any completion is called “verified remote.” Allowlist population is a third, PS-owned merge after evidence package. **No Phase 2 / no waive.**
**Hygiene milestone (items 2–5):** SIGNED OFF — see `SECURITY_SIGNOFF_PRE_PHASE2_HYGIENE.md`.
**Real-plug wire-up milestone:** SIGNED OFF with required follow-ups — see `SECURITY_SIGNOFF_PRE_PHASE2_REAL_PLUGS.md` (NRAS JWT + prod allowlist still open).
**R1/R2 + item (7) E2E skeleton:** SIGNED OFF — see `SECURITY_SIGNOFF_PRE_PHASE2_R1_R2_E2E.md`. Verified remote still blocked (allowlist + fixtures + JWKS preferred).
**J1 JWKS + soft hygiene:** SIGNED OFF — see `SECURITY_SIGNOFF_PRE_PHASE2_J1_JWKS.md`. JWKS URL PS-confirmed (NVIDIA OpenAPI). J2 x5c pin + J3 unknown-kid refetch required before live GPU.
**J2 x5c + J3 kid refetch + iss:** SIGNED OFF — see `SECURITY_SIGNOFF_PRE_PHASE2_J2_J3.md`. Intermediate 004/005 SPKI pinned; CA 001 not required until NVIDIA publishes it. Verified remote still blocked.
**J2/J3 soft polish:** SIGNED OFF — see `SECURITY_SIGNOFF_PRE_PHASE2_J2_J3_SOFT.md`.
**Item (6) draft + fixture capture:** reviewed — production merge **BLOCKED** (compose_manager G1 + 2nd capture G2). See `SECURITY_SIGNOFF_PRE_PHASE2_ITEM6_DRAFT_REVIEW.md`. measurements.json still empty. Genuine samples accepted as evidence.
**Item (6) after G1/G2:** G1+G2 SIGNED OFF; production merge still **BLOCKED** on Abliterated product accept (G3) + require CM present (G4). See `SECURITY_SIGNOFF_PRE_PHASE2_ITEM6_G1_G2.md`.
**G3 REJECT Abliterated** (Lead+SLM): no pin for `ce0dbf70…`; need non-abliterated capture + G4 before item (6) merge.
**Item (6) APPROVED** for `z-ai/glm-5.3-flash` (G4 + non-abliterated). Merge PR from `SECURITY_SIGNOFF_PRE_PHASE2_ITEM6_GLM.md` / `allowlist/APPROVED_z-ai_glm-5.3-flash.entry.json`. Phase 2 still Lead-gated. Abliterated DeepSeek remains rejected.
**Phase 2 opened (Lead, 2026-10-29):** verified-remote / agent loops against `z-ai/glm-5.3-flash` pin only. PS watching AE for attestation regressions; no waive of allowlist/CM fail-closed rules. See `SECURITY_WATCH_PHASE2_GLM_PIN.md`.
**Phase 2 M1:** GREEN on pinned GLM; second instance DENY-until-retry (no second pin yet). See `SECURITY_DECISION_PHASE2_M1_SECOND_INSTANCE.md`.
**Phase 2 M2:** security skim OK (injection wrap + attest retry bounds). See `SECURITY_REVIEW_PHASE2_M2.md`. Second pin approved pending AE append.
**Phase 2 M3:** security skim OK (view_state caps + read-only tools). Soft: sanitizer vs tool base64; compose_file_sha256 schema still open. See `SECURITY_REVIEW_PHASE2_M3.md`.
**compose_file_sha256:** PS acceptance defined — `SECURITY_ACCEPTANCE_COMPOSE_FILE_SHA256.md` (pin `904054f5…` for current GLM; fail-closed mismatch/missing-up).
