# Phase 2 sanitizer (choice **a**: TS parity port)
`src/sanitize.ts` is a line-for-line port of the signed Python stub `privacy/sanitizer.py` + `privacy/secret_heuristics.py`
(same regexes, order, placeholders, reason strings). `test/sanitizer.parity.test.ts` runs the Python reference via
`python3` on 17 shared vectors and asserts identical ok/text/reasons/redaction kinds.

Contract: secrets (PEM, 64+ hex, ed25519 secret, sk-, api_key=, base64 blob, BIP39-like run) → **reject in every mode**;
addresses (implicit-in-context, *.near/*.testnet, EVM) → redact (`[NEAR_IMPLICIT]`, `[NEAR_ACCOUNT]`, `[EVM_ADDRESS]`) or reject in `mode=reject`;
internal error/non-string → fail-closed. In the loop, `defaultSanitizer` throws `SanitizerRejected` before attest/complete (remote never called).

Known deltas (TS stricter only): ed25519:/secp256k1: public-key strings (32+ base58) additionally → `[REDACTED_KEY]`.
Redaction records carry `kind`/`placeholder` only (Python also records `span`). Bare 64-hex without address context is rejected as a key (same as Python).
Sanitizer is applied to all string message content, including tool results; a tool output containing secret-like material aborts the loop (fail-closed).
Single source of truth remains `privacy/`; if Python PATTERNS change, the parity test fails until TS is synced. Orchestrators should eventually share one contract (e.g. generated vectors/JSON rules).
