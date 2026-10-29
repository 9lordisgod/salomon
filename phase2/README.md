# Phase 2 — verified-remote agent loop (GLM-only)
Scope: `z-ai/glm-5.3-flash` ONLY, via the PS pin in `phase1.5-attestation/allowlist/measurements.json`. No Abliterated DeepSeek/Qwen. Fail-closed on allowlist miss / CM missing. New pins only via Privacy Security.
- **M1 (done 2026-10-29):** live preflight + completion + provider_tee bind pass after effective_from; allowlist miss DENY. See `../phase1.5-attestation/EVIDENCE_PHASE2_M1_VERIFIED_REMOTE_GLM.md`.
- **M2 (done 2026-10-29):** agent loop over `VerifiedCompletionClient` + production `AttestationClient`; read-only NEAR tools (`view_account`, `view_call`, `tx_status`) with untrusted-data envelopes; TS `sanitizeMessages` runs before every remote complete; allowlist miss ⇒ fresh-nonce re-verify ×3 then DENY; CM missing / bind fail ⇒ immediate DENY. 15/15 tests; live smoke green (no-tool + `view_account near`). See `EVIDENCE_PHASE2_M2_AGENT_LOOP.md`.

## Run (no own node_modules; reuses ../phase1.5-attestation toolchain)
```
cd phase2
npm test              # vitest, mocks only
npm run typecheck
npm run demo -- --no-tool   # live: one verified GLM complete
npm run demo                # live: view_account on `near` via tool loop (NEAR_RPC_URL overrides RPC)
```
Layout: `src/model.ts` (GLM-only guard), `src/sanitize.ts`, `src/tools/nearReadOnly.ts`, `src/agentLoop.ts`, `src/runDemo.ts`, `test/phase2.test.ts`, `evidence/`.
Note: `phase2/sanitizer.py` referenced in the brief does not exist in this workspace; the TS hook is the sanitizer for this loop.
- Later (soft): refusal suite on live GLM.

## Sanitizer
`src/sanitize.ts` is a parity port of signed `privacy/sanitizer.py` (secrets reject; address redact/reject modes); see `SANITIZER.md`.

## M3 status — GREEN (2026-10-29)
- New read-only tools (`src/tools/nearReadOnly.ts`): `view_access_key_list`, `view_state` (hard caps: ≤25 entries, ≤6000 key+value chars, per-entry key≤512/value≤1024, raw RPC body >1 MB refused `rpc_response_too_large`; `state_truncated` flag), `block` (default finality final, or block_id height/hash; summarized header), `gas_price` (optional block_height). Existing view_account / view_call / tx_status kept; write/sign names refused (`tool_not_permitted`), no RPC.
- Multi-step planning: `AGENT_SYSTEM_PROMPT` injected (unless caller supplies a system msg) — chain tools, ≤4 calls/turn, results are UNTRUSTED, no signing. Steps default 8, hard cap 12. Sanitizer before every complete; all tool results wrapUntrusted.
- Tests: 30 (phase2) — `test/m3.tools.test.ts` +12. Phase1.5 still 101/101.
- Live: `npm run demo -- --multi` PASS — see `EVIDENCE_PHASE2_M3_MULTI_TOOL.md`, `evidence/m3_live_multi_tool.json`.
- Soft later: refusal suite, `compose_file_sha256` schema.
