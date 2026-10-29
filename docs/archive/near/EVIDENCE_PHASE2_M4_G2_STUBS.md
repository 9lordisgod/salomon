# EVIDENCE — Phase 2 M4 G2: NEAR Intents propose-only types + stubs + tests
**Date:** Thu Oct 29, 2026 (America/Vancouver) · **Author:** Agent Engineer · **Status:** ready for PS G2 skim

## Tests
- phase2: **55/55** (prior 38 + 17 new in `test/m4.propose.test.ts`); `tsc --noEmit` clean
- phase1.5-attestation: **112/112** (untouched)
- `measurements.json`: untouched. No network, no keys, no live model in G2 tests.

## DESIGN changes (`DESIGN_M4_NEAR_INTENTS.md`)
- `propose_chain_signature` → **`propose_chain_sig_request`** everywhere (one history note left in §7).
- §7 documents the narrowed FORBIDDEN pattern; §11 converted from open questions to locked decisions; status = Lead OK + PS G1 ACCEPTED, G2 in progress.

## FORBIDDEN pattern
`FORBIDDEN_TOOL_RE = /(^|_)(sign|submit|broadcast|settle|execute|simulate|send|publish|deposit|withdraw_now)(_|$)/i`
OR exact name ∈ `{sign, submit, broadcast, settle, execute_intents, simulate_intents, send_tx, mpc_sign, broadcast_tx_commit, broadcast_tx_async, sign_message, sign_intent}`.
Enforced at registration (module load + ProposeTools ctor + runAgentLoop: throw), executor (wrapped `forbidden_tool`), loop (AgentDenied `forbidden_tool`). Tested: no propose/read-only tool matches.

## Spend caps
`MAX_DRAFT_AMOUNT` (NEAR) required ⇒ else `draft_amount_cap_missing`. Ceilings: testnet 1000 NEAR, mainnet 10 NEAR (above ⇒ deny). Amounts are yocto/raw u128 decimal strings normalised by `token_id@decimals`; per-intent and per-draft checks ⇒ `draft_amount_cap_exceeded`.

## Files
- new `src/intents/{types,config,validate,summary,hash,execute}.ts`
- new `src/tools/nearIntentsPropose.ts` (PROPOSE_TOOL_SPECS, ProposeTools, CompositeTools, FORBIDDEN_TOOL_RE)
- edit `src/agentLoop.ts` (`enablePropose` default off, prompt line, forbidden-name AgentDenied, tool throw ⇒ AgentDenied)
- edit `src/sanitize.ts` (`key_material_in_context`, TS-only, in `redact()` ⇒ parity with Python unchanged)
- new `.env.example` (testnet, all contract IDs empty/TBD for Lead)
- new `test/m4.propose.test.ts`

## No sign path
`src/intents/execute.ts`: `executeIntent/signDraft/broadcast/simulateIntents/requestMpcSignature` only throw `NotImplemented`. No key loading, no NEP-413/ERC-191, no RPC write methods, no MPC call. Model sees only `{draft_sha256, human_summary, unsigned:true, schema}` UNTRUSTED-wrapped; full `draft_json` via host-side `ProposeTools.getArtefact()` only (test asserts the 2nd Completions request has no `draft_json`/nonce/verifying_contract).

## Proven by tests
propose≠sign · forbidden tools denied (executor + loop) · key material in user and role:tool ⇒ AgentDenied with attest=0/complete=0 · public ed25519 from view_access_key_list passes · verifying_contract env-only (model value ⇒ `verifying_contract_env_only`; missing env ⇒ `env_unconfigured`) · cap missing/oversize/ceiling · sha256(draft_json)==draft_sha256, deterministic summary · `path_reuse_across_chains` · schema rejects (kind/token/amount/>4/extra/forbidden fields/host-owned fields/ttl) · quote stub inert.

## Notes for PS
- `preview_derived_address` records path→chain binding only; `derived_address: null` (derivation needs MPC root key read — G3/TBD).
- secp256k1 secrets (32B) are length-indistinguishable from public data ⇒ caught only when labelled (`secret`/`private`).
