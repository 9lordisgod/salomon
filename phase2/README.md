# Phase 2 — Safe agent runtime (tools + sanitizer)

Salomon's agent loop: the model plans and calls **read-only, allowlisted tools**; every message is **sanitized** before it leaves the device; every tool result is **untrusted data**; the model never holds keys or executes privileged actions. Remote completions go only to a **verified-remote** endpoint (attested, allowlisted), fail-closed.

**Status:** M1–M3 **GREEN**; soft polish closed. Model pin: `z-ai/glm-5.3-flash` only, via the Privacy & Safety allowlist in `../phase1.5-attestation/allowlist/measurements.json` (new pins only via Privacy & Safety).

## Milestones
- **M1 — verified-remote completion (done 2026-10-29):** preflight + completion + instance bind; allowlist miss ⇒ DENY. `../phase1.5-attestation/EVIDENCE_PHASE2_M1_VERIFIED_REMOTE_GLM.md`.
- **M2 — agent loop (done 2026-10-29):** loop over `VerifiedCompletionClient` + `AttestationClient`; `sanitizeMessages` before every complete; allowlist miss ⇒ fresh-nonce re-verify ×3 then DENY; measurement missing / bind fail ⇒ immediate DENY; untrusted-data envelopes on tool results. `EVIDENCE_PHASE2_M2_AGENT_LOOP.md`.
- **M3 — multi-step tools (GREEN 2026-10-29):** `AGENT_SYSTEM_PROMPT` (≤4 calls/turn, results UNTRUSTED, no signing); steps default 8, hard cap 12; hard size caps on tool output; write/sign tool names refused `tool_not_permitted` with no network call. Multi-step evidence archived with the prior demo domain — see below.
- **Soft polish (closed):** live refusal suite stamped; `compose_file_sha256` schema; `role:tool` sanitizer coverage.
- **Propose-only pattern (archived settlement target):** M4 G1+G2 accepted the propose → policy → human-approval shape (model never holds keys). Execute/sign (G3) was **never opened**. Evidence: [`docs/archive/near/`](../docs/archive/near/) · track note [`docs/archive/crypto-near-track.md`](../docs/archive/crypto-near-track.md).

## Sanitizer
`src/sanitize.ts` is a parity port of signed `../privacy/sanitizer.py`: secrets ⇒ reject; identifiers ⇒ redact or reject by mode. See `SANITIZER.md`.

## Run (reuses ../phase1.5-attestation toolchain)
```
cd phase2
npm test                    # vitest, mocks only
npm run typecheck
```
Layout: `src/model.ts` (model pin guard), `src/sanitize.ts`, `src/agentLoop.ts`, `src/tools/` (`guard.ts` allowlist guards, `untrusted.ts` envelopes), `src/localModel.ts`, `test/`, `evidence/`.

## Archived (prior crypto / NEAR demo domain — history only)
Earlier Phase 2 demos used a chain RPC read-only tool set and an Intents propose-only sketch against a named cloud TEE provider. That product framing is archived. Keep the **agent loop, sanitizer, caps, and propose-only approval pattern**; do not treat chain tools or Intents settlement as product scope. Index: [`docs/archive/near/`](../docs/archive/near/) · [`docs/archive/crypto-near-track.md`](../docs/archive/crypto-near-track.md). Next research tool domains are a Lead call (Phase 3 journalist MVP).
