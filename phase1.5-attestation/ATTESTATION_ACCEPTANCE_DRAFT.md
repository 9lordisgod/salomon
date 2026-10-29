# Attestation acceptance checklist — DRAFT (Agent Engineer → Privacy Security)

**Status:** draft for Privacy Security to merge into `ATTESTATION_ACCEPTANCE.md`  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Scope:** Phase 1.5 item (2) acceptance bar only. No Phase 2 / no waive.  
**Aligns with:** `phase2-readiness.md` A1; docs.near.ai model-attestations + openai-compatibility.

## 0. Scope / non-goals
- Required before any remote inference or write-capable tools.
- Gateway base: `https://cloud-api.near.ai/v1`. Prefer gateway; direct `{slug}.completions.near.ai` out of scope for green acceptance.
- Privacy Security owns this bar and signs off; Agent Engineer implements.

## 1. Fail-closed cases (any → DENY remote call; no silent continue)
- [ ] Missing HTTP report / non-2xx / timeout / DNS / TLS failure
- [ ] Malformed JSON or missing required fields
- [ ] `model_attestations` omitted or empty when NEAR model evidence is required (default: required)
- [ ] `request_nonce` ≠ client-generated nonce
- [ ] Quote verify fail (DCAP / TCB / advisory policy)
- [ ] Nonce or `signing_address` not bound in verified quote report_data
- [ ] RTMR3 replay of `event_log` ≠ quote RTMR3
- [ ] MRCONFIGID mismatch vs raw `app_compose` hash rule (`01 || sha256(app_compose) || 15×0x00`)
- [ ] GPU evidence present but fails verification (see open Q on `require_gpu`)
- [ ] Verified measurements not on allowlist
- [ ] QuoteVerifier not configured → DENY (`quote_verifier_not_configured`)
- [ ] Ambiguous or zero retained verified candidates after filtering
- [ ] `provider_tee` response signature with 0 or >1 matching retained report → UNVERIFIED / DENY
- [ ] Missing `x-no-aliasing: true` or non-canonical model id → DENY
- [ ] No fallback to unattested call, skip-attest flags on prod/CI remote paths, or post-hoc attest after completion

## 2. What must be verified (preflight, every candidate)
- [ ] Client nonce: 32-byte CSPRNG hex, local per preflight
- [ ] Fetch: `GET /v1/attestation/report` with canonical `model`, `provider=near`, `signing_algo`, `nonce`, `include_tls_fingerprint=false`; headers `Accept: application/json`, `x-no-aliasing: true`, Bearer API key
- [ ] **Gateway vs model:** `gateway_attestation` ≠ model evidence; gateway pass alone never authorizes model trust
- [ ] Per candidate: DCAP quote → nonce/`signing_address` binding → RTMR3 replay → MRCONFIGID/app_compose → GPU if present → allowlist
- [ ] Retain only verified candidates; completions only after non-empty retain set with same canonical model id + `x-no-aliasing: true`

## 3. Logging (digest-only)
- [ ] Allowed: timestamp, canonical model id, provider, signing_algo, nonce or nonce hash, digests (quote, RTMR3, MRCONFIGID, app_compose hash, signing_address), candidate index, pass/fail, reason code
- [ ] Forbidden: prompt, completion, user tool content, API key, raw quote dumps (default)
- [ ] Type/runtime guard rejects log keys `prompt`, `messages`, `completion`, `api_key`

## 4. Allowlist source of truth + updates
- [ ] Versioned repo file (proposal: `phase1.5-attestation/allowlist/measurements.json`) with model id, MRCONFIGID/app_compose hash, RTMR3 (or event_log policy), optional GPU fields, effective_from, notes, Privacy Security approver
- [ ] Updates: PR-only; Privacy Security required review; no unpinned remote allowlist fetch (default local file)
- [ ] Empty allowlist → fail-closed deny-all remote until signed entry exists
- [ ] Missing/unreadable allowlist file → DENY

## 5. Preflight ordering
- [ ] Order: sanitizer (when present) → **attest verify** → only then completions
- [ ] Remote path must call assert-ready; no constructible skip; 1.5 proves via unit tests
- [ ] Required tests: empty attestations; nonce mismatch; stub verifier not configured; allowlist miss; digest logger rejects prompt key; happy path only with explicit test MockQuoteVerifier

## Open questions (Privacy Security decides)
1. Default `require_gpu`: verify-if-present vs always require for `provider=near`?
2. Is `gateway_attestation` mandatory in addition to `model_attestations` for green, or model-only for 1.5?
3. Allowlist: pin exact RTMR3 vs small set of event_log digests per release?
4. Evidence retention: digest-only forever, or optional sealed audit store?

## Sent to
Privacy Security (id 496089c9-5670-487a-834a-da819262c5c4) for merge into ATTESTATION_ACCEPTANCE.md.
