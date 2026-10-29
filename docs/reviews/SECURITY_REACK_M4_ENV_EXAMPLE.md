# Re-ack — M4 `.env.example` testnet IDs
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**File:** `phase2/.env.example`

## Verdict
**RE-ACKED** for propose-only / G2 config. G3 still closed (no execute/sign/simulate).

| Field | Value | PS |
|-------|--------|-----|
| `INTENTS_VERIFIER_ID` | *(empty)* | **Accept.** Official Intents has no testnet Verifier; empty ⇒ `env_unconfigured` fail-closed (recomputed). Do **not** put `intents.near` here. |
| `MPC_CONTRACT_ID` | `v1.signer-prod.testnet` | **Accept.** Matches NEAR chain-signatures docs; `view_account` OK on testnet RPC. |
| `TOKEN_ALLOWLIST` | `wrap.testnet@24,usdc.fakes.testnet@6,usdt.fakes.testnet@6` | **Accept** as propose-only schema/preview NEP-141s; **not** Intents Verifier assets. Accounts exist on testnet. |
| Mainnet / unofficial sandboxes in default example | none | **Accept.** |

## Soft residual (non-blocking)
`loadIntentsConfig` currently accepts a mainnet-shaped `INTENTS_VERIFIER_ID` (e.g. `intents.near`) when `NETWORK=testnet`. Prefer a later check: testnet profile must not accept bare `.near` verifier IDs. Not required for this re-ack of the empty default.

## Non-waivers
Empty verifier means `propose_intent` stays denied until Lead opts into a verified sandbox/mainnet path under a new PS review. No sign path.
