# Evidence — Phase 2 M4 soft polish: verifier_mainnet_on_testnet

## Change
- `phase2/src/intents/config.ts` — in `loadIntentsConfig`, after the existing account-format check: if `NETWORK=testnet` and `INTENTS_VERIFIER_ID` is `intents.near` or ends with `.near` but not `.testnet` ⇒ `throw new DraftDenied("verifier_mainnet_on_testnet")`. Same denial surface as `env_unconfigured`, so `propose_intent` fails closed with `error: "verifier_mainnet_on_testnet"`.
- `phase2/test/m4.propose.test.ts` — new describe block.
- Empty verifier ⇒ still `env_unconfigured`. Mainnet: no new rule. No G3; execute/sign/broadcast/simulate and measurements.json untouched.

## Denial reason
`verifier_mainnet_on_testnet`

## Tests (describe "soft polish: verifier_mainnet_on_testnet")
- testnet + intents.near ⇒ verifier_mainnet_on_testnet (config + propose path)
- testnet + bridge.near ⇒ verifier_mainnet_on_testnet
- testnet + empty verifier ⇒ still env_unconfigured
- testnet + *.testnet verifier ⇒ not verifier_mainnet_on_testnet

## Run
`cd phase2 && npm test` ⇒ 5 files, 59/59 passed (m4.propose 21/21). `npm run typecheck` clean.
