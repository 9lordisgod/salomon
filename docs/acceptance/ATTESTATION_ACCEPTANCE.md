# Attestation acceptance — Phase 1.5 item (2)
**Status:** ACCEPTED BAR (Privacy Security) — client implementation still pending Agent Engineer sign-off request  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Owners:** Privacy Security (bar + sign-off). Agent Engineer (verify client).  
**Sources merged:** Agent Engineer checklist (`phase1.5-attestation/ATTESTATION_ACCEPTANCE_DRAFT.md`), `phase2-readiness.md` A1, docs.near.ai model-attestations / openai-compatibility.  
**Gate:** Required before any remote inference or write-capable tools. **No Phase 2 / no waive.** Item (5) refusal eval is separate and stays closed.

## 0. Scope / non-goals
- Gateway base: default provider TEE host `/v1` (`ATTEST_API_BASE_V1`). **Green acceptance is gateway-path only.** Direct `{slug}.completions.near.ai` is out of scope for item (2) green (experimental / weaker verification).
- Attestation proves *which* code/config ran — not that the code is good. Allowlisted measurements still need human review of compose/image.
- Non-goals for 1.5: live Cloud soak, sealed long-term evidence warehouse, IronClaw, unlinkable payments.

## Decisions on open questions (locked)

| # | Question | Decision |
|---|----------|----------|
| 1 | `require_gpu` | **Verify-if-present.** If `nvidia_payload` is present → must verify or DENY. Default `require_gpu=false` for 1.5 so CPU-only TEE models are not blocked. If config sets `require_gpu=true` and payload absent → DENY. Flip to require-gpu only via reviewed config change. |
| 2 | `gateway_attestation` | **Mandatory on the gateway path in addition to `model_attestations[]`.** Gateway pass alone never authorizes model trust. Missing/failed gateway attestation on gateway base URL → DENY. Model attestations remain required (non-empty, verified, allowlisted). |
| 3 | Allowlist pins | **Exact pins per entry:** canonical model id + MRCONFIGID / `app_compose` hash + RTMR3 (and GPU digests when `require_gpu` or payload present). Multiple release entries allowed. No fuzzy RTMR3. Optional: list exact `event_log` digests that must replay to the pinned RTMR3 — still exact, not a range. |
| 4 | Evidence retention | **Digest-only by default (forever for stub/client logs).** Optional sealed evidence store is deferred (Phase 4 / audit opt-in); default OFF. No raw quote blobs in normal logs or metrics. |

## 1. Fail-closed cases (any → DENY remote call; no silent continue)
- [ ] Missing HTTP report / non-2xx / timeout / DNS / TLS failure
- [ ] Malformed JSON or missing required fields
- [ ] `model_attestations` omitted or empty (NEAR model evidence **required** by default)
- [ ] `gateway_attestation` missing or failed on gateway path (see Decision 2)
- [ ] `request_nonce` ≠ client-generated nonce
- [ ] Quote verify fail (DCAP / TCB / advisory policy)
- [ ] Nonce or `signing_address` not bound in verified quote `report_data`
- [ ] RTMR3 replay of `event_log` ≠ quote RTMR3
- [ ] MRCONFIGID mismatch vs raw `app_compose` hash rule (`01 || sha256(app_compose) || 15×0x00`)
- [ ] `nvidia_payload` present but GPU verify fails; or `require_gpu=true` and payload absent
- [ ] Verified measurements / compose hash / MRTD / RTMR3 not on allowlist
- [ ] QuoteVerifier not configured (stub left wired / prod misconfig) → DENY (`quote_verifier_not_configured`)
- [ ] Zero or ambiguous retained verified candidates after filtering
- [ ] Later `provider_tee` response signature with 0 or >1 matching retained report → UNVERIFIED / DENY
- [ ] Request without `x-no-aliasing: true` or completion not using canonical model id → DENY
- [ ] Empty / missing / unreadable allowlist file → DENY (deny-all remote)
- [ ] **Rejected patterns:** fallback to unattested OpenAI-compatible call; `SKIP_ATTEST` / `ALLOW_NO_ATTEST` (or equivalent) honored on any remote path in CI or prod builds; post-hoc attest after completion; constructing a completions client without a retained verified set for that model

## 2. What must be verified (preflight, every candidate)
- [ ] Client nonce: 32-byte CSPRNG hex, generated locally per preflight (single-use)
- [ ] Fetch: `GET /v1/attestation/report` with `model=<canonical>`, `provider=near`, `signing_algo` (`ecdsa`|`ed25519` per policy), `nonce`, `include_tls_fingerprint=false`; headers `Accept: application/json`, `x-no-aliasing: true`, `Authorization: Bearer <ATTEST_API_KEY>`
- [ ] **Gateway vs model separation:** verify gateway attestation (gateway path) **and** each model candidate; gateway ≠ model trust
- [ ] For each `model_attestations[]` candidate:
  1. Verify `intel_quote` with Intel DCAP (e.g. dcap-qvl) + configured TCB/advisory policy
  2. Read `report_data` from verified quote; bind client nonce + `signing_address`; match `request_nonce`
  3. Replay `event_log` → RTMR3 equals quote RTMR3
  4. Decode `tcb_info` if JSON text for raw `app_compose`; hash without re-serialize; MRCONFIGID check as above
  5. If `nvidia_payload` present (or `require_gpu=true`) → GPU evidence verification per NEAR docs
  6. Allowlist / provenance policy on verified exact pins
- [ ] Retain only verified + allowlisted candidates; never select a raw unverified entry
- [ ] Completions only after retain set non-empty; same canonical model id + `x-no-aliasing: true`

## 3. Logging (digest-only)
- [ ] **Allowed:** timestamp, canonical model id, provider, signing_algo, client nonce **hash** (prefer hash over raw nonce in durable logs), report request_id if any, digests (sha256 of intel_quote, RTMR3, MRCONFIGID, app_compose hash, signing_address), candidate index, pass/fail, failure reason code
- [ ] **Forbidden** in logs / metrics labels / exceptions surfaced to UI: prompt, completion, tool args with user content, API key, raw quote blob dumps
- [ ] Type/runtime guard rejects any log record containing keys like `prompt`, `messages`, `completion`, `api_key`
- [ ] Sealed evidence store: default OFF (Decision 4)

## 4. Allowlist source of truth + measurement updates
- [ ] Source of truth: versioned repo file `phase1.5-attestation/allowlist/measurements.json` (JSON preferred) with per entry: `model_id`, `mrconfigid` / `app_compose_sha256`, `rtmr3`, optional `event_log_digests[]` (exact), optional GPU fields, `effective_from`, `notes`, `privacy_security_approver`
- [ ] Updates: **PR-only**; Privacy Security required review; no runtime fetch of allowlist from the internet without pin+signature (default: **local file only** for 1.5)
- [ ] Empty allowlist → fail-closed deny-all remote until ≥1 Privacy Security–signed entry exists
- [ ] Client loads allowlist path via config/env; mismatch or missing file → DENY

## 5. Preflight ordering
- [ ] Order: **local sanitizer** (when present / opted) → **attest verify** → only then `chat/completions`
- [ ] `assertReadyForRemoteInference()` (name flexible) must gate the remote path; completions client must not be usable without a retained verified set for that model
- [ ] Failure anywhere above → **no** network completion call
- [ ] **Required tests before Privacy Security sign-off of the client:** empty `model_attestations`; nonce mismatch; QuoteVerifier not configured; allowlist miss / empty allowlist; digest logger rejects `prompt` key; gateway attestation missing; `nvidia_payload` present but GPU verify fails; happy path **only** with explicit `MockQuoteVerifier` in tests (never a production skip flag)

## Accept / reject deltas vs Agent Engineer draft

| Item | Verdict | Note |
|------|---------|------|
| Fail-closed matrix (§1) | **ACCEPT** | Added explicit gateway-missing DENY; banned skip-attest env on remote paths |
| Verify steps (§2) | **ACCEPT** | Gateway + model both required on gateway path |
| Digest-only logging (§3) | **ACCEPT** | Prefer logging nonce **hash**; raw evidence store default OFF |
| Allowlist file + PR review (§4) | **ACCEPT** | Exact RTMR3 / MRCONFIGID pins; multi-entry OK; no fuzzy match |
| Preflight order + tests (§5) | **ACCEPT** | Sanitizer → attest → completions; MockQuoteVerifier tests only |
| `require_gpu` always-on | **REJECT** | Use verify-if-present; default `require_gpu=false` for 1.5 |
| Model-only attestation for 1.5 green | **REJECT** | Gateway attestation also mandatory on gateway path |
| Fuzzy / open RTMR3 ranges | **REJECT** | Exact pins only |
| Always-on sealed evidence store | **REJECT for 1.5** | Digest-only default; sealed store deferred |

## Sign-off rule
Privacy Security signs off item (2) only when: this bar is implemented, the required unit tests above are green, allowlist file exists (may start with zero production measurements but then remote must DENY — for a “green client” demo use MockQuoteVerifier + a test allowlist entry clearly marked `test_only: true` that cannot load in prod config), and Agent Engineer requests review with a short evidence note (test output + paths).

**Item (2) is not signed off yet.** This document locks the bar only.

## Pre–Phase-2 follow-on (plugs / allowlist / provider_tee / report_data)
Locked separately in `PRE_PHASE2_ACCEPTANCE.md` (2026-10-29). Item (2) stub is signed; live remote still DENY until that bar clears.
