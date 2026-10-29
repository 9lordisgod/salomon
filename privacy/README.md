# privacy/ — Phase 1.5 stubs (Privacy Security)
- `sanitizer.py`: `sanitize_for_remote(text, SanitizerConfig)` runs locally before any remote call.
  Secrets (BIP39-like, PEM, long hex, ed25519, API keys, base64 blobs) → `ok=False` in every mode.
  Addresses (`*.near`/`*.testnet`, context-prefixed 64-hex implicit, `0x`+40 hex) → typed placeholders (or reject in `mode="reject"`).
  Any error → reject (fail-closed).
- `secret_heuristics.py`: copy of `phase1-slm/scripts/secret_scan.py` heuristics; parity test keeps them in sync.
- `policy_spend.py`: allowlist + caps + rate limit; returns allow/deny/needs_human. Cannot sign. In-memory counters (not durable).
- Tests: `python3 privacy/test_sanitizer.py && python3 privacy/test_policy_spend.py` (synthetic fixtures, no network).
Not a substitute for the refusal eval (item 5) or attestation verify (item 2).
