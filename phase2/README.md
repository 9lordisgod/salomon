# Phase 2 — Safe agent runtime (tools + sanitizer)

Salomon's agent loop: the model plans and calls **read-only, allowlisted tools**; every message is **sanitized** before it leaves the device; every tool result is **untrusted data**; the model never holds keys or executes privileged actions. Remote completions go only to a **verified-remote** endpoint (attested, allowlisted), fail-closed.

**Status:** M1–M3 **GREEN**; soft polish closed; phase2 tests **59/59**. Model pin: `z-ai/glm-5.3-flash` only, via the Privacy & Safety allowlist in `../phase1.5-attestation/allowlist/measurements.json` (new pins only via Privacy & Safety).

## Milestones
- **M1 — verified-remote completion (done 2026-10-29):** preflight + completion + instance bind; allowlist miss ⇒ DENY. `../phase1.5-attestation/EVIDENCE_PHASE2_M1_VERIFIED_REMOTE_GLM.md`.
- **M2 — agent loop (done 2026-10-29):** loop over `VerifiedCompletionClient` + `AttestationClient`; `sanitizeMessages` before every complete; allowlist miss ⇒ fresh-nonce re-verify ×3 then DENY; measurement missing / bind fail ⇒ immediate DENY; untrusted-data envelopes on tool results. `EVIDENCE_PHASE2_M2_AGENT_LOOP.md`.
- **M3 — multi-step tools (GREEN 2026-10-29):** `AGENT_SYSTEM_PROMPT` (≤4 calls/turn, results UNTRUSTED, no signing); steps default 8, hard cap 12; hard size caps on tool output (≤25 entries, ≤6000 chars, >1 MB body refused); write/sign tool names refused `tool_not_permitted` with no network call. `EVIDENCE_PHASE2_M3_MULTI_TOOL.md`.
- **Soft polish (closed):** live refusal suite stamped; `compose_file_sha256` schema; `role:tool` sanitizer coverage.

## Sanitizer
`src/sanitize.ts` is a parity port of signed `../privacy/sanitizer.py`: secrets ⇒ reject; identifiers ⇒ redact or reject by mode. See `SANITIZER.md`.

## Run (reuses ../phase1.5-attestation toolchain)
```
cd phase2
npm test                    # vitest, mocks only
npm run typecheck
npm run demo -- --no-tool   # live: one verified completion
npm run demo -- --multi     # live: multi-step read-only tool loop
```
Layout: `src/model.ts` (model pin guard), `src/sanitize.ts`, `src/agentLoop.ts`, `src/tools/`, `src/runDemo.ts`, `test/`, `evidence/`.

## Archived (prior on-chain track — history only)
The current read-only tool set (`src/tools/nearReadOnly.ts`: view_account, view_call, tx_status, view_access_key_list, view_state, block, gas_price) targets NEAR RPC — it was the demo domain before the 2026-10-29 pivot and is kept as a working read-only tool pattern. The verified-remote provider in M1–M3 was NEAR AI Cloud. M4 (Intents propose-only stubs; G1+G2 ACCEPTED, soft verifier ACCEPT, salomon `79c0f99`) is archived; G3 (execute/sign) was never opened. Next tool domains are a Lead call.
