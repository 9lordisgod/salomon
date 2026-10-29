# Policy/Spend Acceptance Criteria — Phase 1.5 item (4)
**Owner:** Privacy Security · **Date:** Thu Oct 29, 2026 (America/Vancouver) · **Status:** criteria final; stub present (`privacy/policy_spend.py`), sign-off pending review. Gate OPEN. No Phase 2.

## Required (all; any miss = fail)
1. **No model→sign path.** Only: `propose_tx` → schema validate → simulate (stub ok) → `policy.check` → human if over cap → signer. Policy module imports no signer, holds no keys, makes no network calls.
2. **Allowlist, default deny.** Exact-match receiver account ids AND method names. Empty config = deny all. No wildcards; no `add_full_access_key`/`delete_account`/`deploy_contract` without explicit review.
3. **Caps.** Per-tx and daily, integer yoctoNEAR. Over either cap → `needs_human` / `requires_human=True`; never auto-sign.
4. **Rate limit.** N txs per window (stub: in-memory); exceed → deny.
5. **Structured decision.** `allow | deny | needs_human` + `reasons[]`. Parse/type failure (non-int, negative, bool, float, missing field, wrong type) or internal error → **deny**.
6. **Logging.** Decision, reasons, receiver, method, deposit, tx hash/id only. Never private keys, seeds, or full prompt.
7. **State.** Stub counters are in-memory and reset on restart (documented, P15-T9). Production requires durable, atomic counters with a race test.
8. **Tests before sign-off.** Allow; deny unknown receiver/method; needs_human over per-tx and daily cap; deny malformed; default-deny empty config; rate limit; log field whitelist; no-sign/no-network source check.

## Current evidence
`python3 privacy/test_policy_spend.py` → 11/11 PASS (Oct 29 2026). Human approval flow and signer integration are out of scope for the stub.
