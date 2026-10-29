# Archived — crypto / NEAR on-chain track

> **Status: ARCHIVED (Lead pivot 2026-10-29 ~15:16 PDT; niche lock ~15:26 PDT, America/Vancouver).** Not the product. Salomon is now a local research agent for journalists and investigators that protects sources. This page consolidates the prior on-chain narrative so it stays out of the product docs. No evidence file was deleted or moved.

## What the original scaffold targeted
- A specific cloud TEE inference provider (NEAR AI Cloud) as the product backend.
- On-chain read tools (NEAR RPC), Intents-based settlement, Chain Signatures (MPC signing), near-sdk contracts (agent registry, credits/staking, access control), an agent marketplace, and staking-for-credits.
- Original architecture assumptions A1–A6. They were never verified against NEAR docs and are retired with this track.

## What was actually built (engineering truth)
| Item | Outcome | Evidence |
|---|---|---|
| Phase 1.5 attestation client (provider-bound) | SIGNED; kept as the generic fail-closed **verified-remote** pattern | `phase1.5-attestation/`, `docs/signoffs/SECURITY_SIGNOFF_ATTESTATION_ITEM2.md`, `docs/signoffs/SECURITY_SIGNOFF_PRE_PHASE2_ITEM6_GLM.md`, `docs/signoffs/SECURITY_SIGNOFF_PHASE2_SECOND_INSTANCE_GLM.md` |
| Phase 2 M2/M3 read-only tools | GREEN. The tools are NEAR RPC reads (`view_account`, `view_access_key_list`, bounded `view_state`, `block`, `gas_price`) | `phase2/src/tools/nearReadOnly.ts`, `phase2/EVIDENCE_PHASE2_M2_AGENT_LOOP.md`, `phase2/EVIDENCE_PHASE2_M3_MULTI_TOOL.md` |
| M4 G1 — Intents propose-only design | ACCEPTED | `phase2/DESIGN_M4_NEAR_INTENTS.md`, `SECURITY_GATE_PHASE2_M4.md`, `SECURITY_REVIEW_PHASE2_M4_G1.md` |
| M4 G2 — propose-only stubs | ACCEPTED / merge stamped; salomon `34a2466` | `phase2/EVIDENCE_PHASE2_M4_G2_STUBS.md`, `SECURITY_REVIEW_PHASE2_M4_G2.md`, `phase2/src/intents/`, `phase2/src/tools/nearIntentsPropose.ts` |
| `.env.example` testnet IDs | Filled + re-acked. Verifier empty (there is no official Intents testnet), MPC `v1.signer-prod.testnet`, preview tokens `wrap`/`usdc.fakes`/`usdt.fakes` | `SECURITY_REACK_M4_ENV_EXAMPLE.md` |
| Soft polish `verifier_mainnet_on_testnet` | PS ACCEPT; phase2 59/59; salomon `79c0f99` | `phase2/EVIDENCE_PHASE2_M4_SOFT_VERIFIER_TESTNET.md`, `SECURITY_REVIEW_PHASE2_M4_SOFT_VERIFIER_TESTNET.md` |
| M4 G3 — execute / sign / simulate | **Never opened.** Not planned. Settlement was mainnet-only | — |
| Contracts, Chain Signatures, Agent Market, staking-for-credits | Never started | — |
| Seed dataset (362 rows) | PARKED. Content is crypto/NEAR-heavy; on unpark it gets refreshed toward privacy AI for journalism | `docs/notes/SEED_INVENTORY_362.md`, `docs/notes/SEED_REFRESH_PLAN_PRIVACY_AI.md`, `docs/notes/SLM_PIVOT_PRIVACY_FIRST.md` |

## What carries forward into the product
- **Propose → policy → human approval, model never holds keys**: the M4 pattern, reused for any state-changing research tool.
- **Fail-closed verified-remote** client: reused as the optional future confidential compute path (provider unnamed).
- **Agent loop + hard caps + sanitizer on `role:tool` output**: these are independent of chain tools.

Push history: `34a2466` (M4 G2), `79c0f99` (M4 soft polish), `4464e5c`, `bcf2d07` (AI-first pivot). Full chronology: `PROGRESS.md`.

## Archived NEAR M3/M4 docs (2026-10-29 purge)
See docs/archive/near/ — M4 intents design/evidence, M3 multi-tool evidence, M4 security gates/reviews, R3 nearecho signoff. Code removed from phase2 (history in git).
