# Security review — Phase 2 M4 soft polish: `verifier_mainnet_on_testnet`

**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Ask:** Soft residual from `SECURITY_REACK_M4_ENV_EXAMPLE.md` — deny mainnet-shaped Verifier when `NETWORK=testnet`.  
**Evidence:** `phase2/EVIDENCE_PHASE2_M4_SOFT_VERIFIER_TESTNET.md`  
**Code:** `phase2/src/intents/config.ts` (+4 tests in `phase2/test/m4.propose.test.ts`)

## Verdict
**ACCEPT.** Residual closed. G3 remains closed (no execute / sign / simulate / measurements touch).

## What was checked
1. **Placement.** After `ACCOUNT_RE` on `INTENTS_VERIFIER_ID`, before MPC/token/cap loads. Empty / invalid format still `env_unconfigured` (confirmed by test).
2. **Rule.** `NETWORK=testnet` ∧ (`intents.near` ∨ (`*.near` ∧ ¬`*.testnet`)) ⇒ `DraftDenied("verifier_mainnet_on_testnet")`. Same fail-closed propose surface as other config denials.
3. **Mainnet.** No new rule when `NETWORK=mainnet` — `intents.near` still loadable there (unchanged).
4. **Allow path.** `*.testnet` (incl. `intents.near.testnet`) not denied by this reason.
5. **Scope.** Propose-only config gate only. No G3 path, no signer, no measurements.json.

## Recomputed
`cd phase2 && npm test` → **59/59** passed (m4.propose 21/21). Matches AE evidence.

## Soft residual status
Prior note in `SECURITY_REACK_M4_ENV_EXAMPLE.md` (“prefer later reject of bare `.near` verifier on testnet”) → **CLOSED** by this change.

## Non-waivers
- Empty default verifier stays fail-closed until Lead opts into a verified ID under a new PS review.
- G3 execute/sign/simulate still closed.
- This heuristic does not pin a real testnet Verifier (official Intents still has none); it only blocks accidental mainnet-shaped pins on testnet.

