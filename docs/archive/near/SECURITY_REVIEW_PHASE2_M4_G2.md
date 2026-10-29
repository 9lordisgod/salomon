# G2 skim — M4 propose-only stubs
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Evidence:** `phase2/EVIDENCE_PHASE2_M4_G2_STUBS.md`  
**Recomputed:** phase2 **55/55**; phase1.5 **112/112**; measurements `784e4d2e…923f` untouched.

## Verdict
**G2 ACCEPTED / MERGE STAMPED.** Hash+summary HARD, forbidden tools, key_material, NotImplemented stubs, env-only contracts, spend ceilings as Lead re-verified.

## What passes
| Check | Status |
|-------|--------|
| Completions see only `{draft_sha256, human_summary, unsigned, schema}` UNTRUSTED; `draft_json` via `getArtefact()` only | Pass (loop test) |
| `propose_chain_sig_request` rename; narrowed FORBIDDEN does not self-deny propose_* | Pass |
| execute/sign/broadcast/simulate/MPC ⇒ `NotImplemented` → loop `AgentDenied` | Pass |
| `key_material_in_context` secret-length ed25519; public keys OK in view_access_key_list | Pass |
| `.env.example` testnet-first; empty contract IDs; no invented mainnet | Pass |
| enablePropose default off | Pass |

## Spend caps
Lead re-verified G2 with AE’s ceilings: testnet **1000 NEAR** / mainnet **10 NEAR**; `MAX_DRAFT_AMOUNT` required; missing/oversize/over-ceiling ⇒ deny. **Accepted.** (An earlier ~100 NEAR supersession note is superseded by this Lead re-verify.)

## Soft residuals (non-blocking)
1. `preview_derived_address` → null address (path↔chain bind only) — OK until G3 MPC root read.
2. Unlabelled secp256k1 32B secrets only caught when near `secret`/`private` — accept for G2; soft watch.

## Non-waivers
No execute/sign/simulate until G3. Abliterated REJECTED. CM/allowlist/`compose_file_sha256` unchanged.
