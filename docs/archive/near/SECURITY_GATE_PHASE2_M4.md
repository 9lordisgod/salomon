# Security gate — Phase 2 M4 (Intents / non-custodial sketch)
**Author:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver) · **Updated:** same day after G1 + Lead sync  
**Trigger:** Lead opened M4; PS watches plan/PRs. **G1:** ACCEPTED (`SECURITY_REVIEW_PHASE2_M4_G1.md`).

## Hard requirements (fail-closed)
1. **Keys never enter the model.** No private keys, seed phrases, PEM, `ed25519:` **secrets** (secret-length only; public keys OK), or signing material in Completions context.
2. **Signing is outside the model.** Wallet / intent relayer / user device / TEE signer holds keys. Agent drafts **unsigned** intents only.
3. **Sanitizer + AgentDenied** before attest/complete (`key_material_in_context` / `sanitizer_rejected`).
4. **Custody boundary named** before any sign path (Model | Host | Signer outside).
5. **Hash+summary only into Completions** — full `draft_json` stays host-side / outer caller; signed payloads never re-enter the model.
6. **Finite spend caps on drafts** even when unsigned — testnet **1000 NEAR**, mainnet **10 NEAR** (`MAX_DRAFT_AMOUNT` via env/network config; yocto decimal-string; missing ⇒ deny; oversized ⇒ validation deny).
7. **No `simulate_intents` / execute / sign / broadcast** until separate G3 signoff.
8. **No hardcoded mainnet contract IDs** — testnet-first env/profile; PS reviews values at G2.

## Soft / watch
- Intent solvers/relayers are untrusted for content (UNTRUSTED envelopes).
- `FORBIDDEN_TOOL_RE` must not false-deny propose tools (e.g. `propose_chain_signature`) — narrow or rename before G2.

## Non-waivers
Abliterated models stay REJECTED. CM / allowlist / `compose_file_sha256` pins unchanged by M4.
