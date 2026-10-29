# Phase 2 M2 — agent loop evidence (digest-only)
Model: `z-ai/glm-5.3-flash` only. `measurements.json` sha256 `0e84e2548c844f0a05170ba4a547f868385b54d78a57d7fb8280003b2d376e35` (unchanged, before/after). phase1.5-attestation **untouched**; npm test 101/101.

## Tests (mocks): 15/15 pass — `npm test`; typecheck clean
- Tool envelope: single `untrusted_tool_output` object, UNTRUSTED notice, payload JSON-encoded in `data_json` (injection string cannot escape), truncation at 8 KB.
- Only read-only tools; write/sign names and bad args denied with zero RPC; RPC errors wrapped, never thrown.
- Sanitizer redacts ed25519/secp256k1 keys, EVM addrs, 64-hex implicit accounts; contract violation throws; loop sends sanitized messages.
- Non-GLM model ⇒ `model_not_permitted`. complete/bind throw ⇒ `completion_failed` (no content). CM missing ⇒ deny, 1 attempt, no complete. Allowlist miss ×2 then pass ⇒ ok after 3 verifies. Allowlist miss persistent ⇒ exactly 3 verifies then DENY, complete never called. Max steps ⇒ DENY.

## Live smoke (2026-10-29, production plugs, key from .env, never printed; grep of evidence for key name = 0)
| run | UTC | result | steps | content sha256 |
|---|---|---|---|---|
| `--no-tool` (`evidence/m2_live_no_tool.json`) | 17:05Z | ok, attest pass attempt 1 | 1 | `565339bc…12bb3` (len 2) |
| `view_account near` (`evidence/m2_live_view_account_near.json`) | 17:05:33–17:05:45Z | ok, attest pass ×2 (attempt 1 each), tool executed | 2 | `2e92d252…59e44` (len 81) |

Tool-loop completion hashes (req/resp): step1 `057cf6f0…bce0`/`d1b36f7b…ccf`; step2 `e3223a8f…74e1`/`d20c0f24…a04a`. Full digests + library verify log in evidence JSON.
No second-instance (`7bb9af0a…`) hit occurred in these live runs; retry path is covered by mock tests only.
