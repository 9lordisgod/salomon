# Sign-off — Phase 1.5 items (1), (3), (4)
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Recomputed tests:** `privacy/test_sanitizer.py` 17/17, `privacy/test_policy_spend.py` 11/11, `phase1-slm/scripts/test_safety_unit.py` 17/17 (untouched).

## Decisions

| Item | Decision | Notes |
|------|----------|-------|
| (1) Threat model | **SIGNED OFF** (filled for gate) | `THREAT_MODEL_PHASE1.5.md` — assets+CIA, boundaries, P15-T1…T9, exit criteria. Re-open on any Phase 2 PR that adds an asset/boundary. |
| (3) Sanitizer stub + tests | **SIGNED OFF** | `privacy/sanitizer.py`: secrets reject in every mode; addresses redact (`[NEAR_ACCOUNT]` / `[EVM_ADDRESS]` / `[NEAR_IMPLICIT]`); fail-closed on bad input/mode/errors. Heuristic parity test vs `secret_scan`. |
| (4) Policy/spend stub | **SIGNED OFF** (stub only) | Meets `POLICY_SPEND_ACCEPTANCE.md`: default-deny, exact allowlists, per-tx/daily → `needs_human`, rate limit, structured decisions, digest/decision logging, no signer/network imports. |

This does **not** open Phase 2, waive item (2), or clear the R3 near-echo pre-Phase-2 blocker. Item (5) stays closed. **Full gate still OPEN** until item (2) client is signed off.

## Accepted residuals (documented, not blocking 1.5 stub)
- **P15-T3:** 64-hex after address-context words may redact as implicit account instead of secret-reject. Prefer reject-on-ambiguous in a later harden; do not weaken secret reject.
- **P15-T9:** In-memory daily/rate counters reset on restart; not durable/atomic. **Not safe for real funds.** Production needs durable counters + race test before any live signer.
- Human approval of over-cap tx does not yet increment daily total in the stub — design before signer wiring.

## Not signed
- Item (2) attestation **client** — bar locked in `ATTESTATION_ACCEPTANCE.md`; awaiting Agent Engineer green tests.
