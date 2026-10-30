# Phase 2 readiness (Agent Engineer) — plan only, no code yet

**Gate:** Do not implement until `docs/STATUS.md` marks Phase 1 complete **and** Phase 1.5 is opened.
**Last updated:** Wed Oct 28, 2026 (America/Vancouver, PDT)

## Ownership (Lead Architect)

| Owner | Scope |
| --- | --- |
| **Agent Engineer (me)** | Attestation verify (before any remote inference or write tools); tool schemas; agent loop; NEAR AI Cloud client; Agent Market listing readiness; Phase 1.5 stubs when opened |
| **Privacy Security** | Acceptance criteria for attestation verify; **must sign off** before remote inference ships |
| **Tech Docs** | Fold verified assumptions into ARCHITECTURE.md / STATUS when Phase 1.5 opens |

## Docs-verified (A1) — fold into ARCHITECTURE at Phase 1.5 open

- Base URL: `https://cloud-api.near.ai/v1` (OpenAI-compatible chat/completions, tools, streaming).
- Attestation: `GET /v1/attestation/report` with `model`, `provider=near`, `signing_algo`, client `nonce`; header `x-no-aliasing: true`.
- Preflight: verify every `model_attestations[]` candidate **before** completion; fail if missing/empty when policy requires model evidence.
- Evidence: Intel TDX quote (+ optional NVIDIA GPU); gateway attestation is separate from model attestation.
- Prefer gateway path; direct `{slug}.completions.near.ai` is experimental / weaker verification.

Sources: [OpenAI Compatibility](https://docs.near.ai/cloud/guides/openai-compatibility), [Model Attestations](https://docs.near.ai/cloud/verification/cloud-api/model-attestations), [Private Inference](https://docs.near.ai/cloud/private-inference).

## Phase 2 core (after gate)

### 1. Attestation verify (first, blocking)

- **Fail-closed:** any verify failure → no remote call.
- Log **digest only** (quote/measurement hashes, model id, nonce, pass/fail). **Never log prompt or completion content.**
- Steps (sketch): generate nonce → fetch report → verify DCAP quote / RTMR3 / MRCONFIGID / GPU if present → allowlist measurements → retain verified signing identity → only then call completions with canonical model id + `x-no-aliasing: true`.
- Privacy Security defines acceptance criteria and signs off.

### 2. Read-only tools + agent loop (TS)

- Tools: NEAR RPC `view_account`, `call_function` (view), `tx` lookup — no writes.
- Injection-safe tool output: wrap untrusted chain/RPC data; never treat memos/token names/metadata as instructions.
- Model never holds raw private keys; writes (later) go proposal → schema → sim → policy → approval → signer.

### 3. NEAR AI Cloud private inference backend

- OpenAI SDK client pointed at gateway; API key from env/vault only.
- Always run attestation verify preflight when remote path is used.
- Local-first: remote only when local SLM insufficient / explicitly chosen.

### 4. Agent Market listing readiness (prep for Phase 3)

- Track official SDK (`nearai/agents-market-sdk`) and worker API (`GET /v1/agents/me/assignments`, start/submit).
- Listing docs: [List your agent](https://docs.market.near.ai/list-your-agent). No listing submit until Phase 3 + user/Lead go-ahead.

## Phase 1.5 stubs (when STATUS opens 1.5 — still no remote inference)

1. **Local sanitizer hook** — pluggable pre-remote rewrite/strip (PII, addresses); default no-op or strip-addresses flag; runs before any Cloud call.
2. **Policy / spend stub on signer path** — allowlists, per-tx + daily spend limits, rate limits; reject or require human approval above limits. Stub interface only until Phase 4 hardens.

## Build order when unblocked

1. Phase 1.5 stubs (sanitizer hook + policy/spend stub).
2. Attestation verify module + Privacy Security sign-off.
3. Read-only NEAR tools + injection-safe TS agent loop.
4. Cloud client wired through sanitizer → attest → complete.
5. Agent Market readiness notes / dry-run listing checklist (no live list without approval).

## Out of scope until later phases

- Write tools / Chain Signatures / Intents execution (Phase 3).
- Full policy engine + production threat docs (Phase 4; Privacy Security + Tech Docs).
