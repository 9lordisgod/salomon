# G1 skim — M4 NEAR Intents design
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Artefact:** `phase2/DESIGN_M4_NEAR_INTENTS.md` (+ `SECURITY_GATE_PHASE2_M4.md`)

## Verdict
**G1 ACCEPTED.** Custody table §1 names the boundary; all four hard gates are baked in. Proceed to G2 types/stubs/propose≠sign tests only. No execute/sign until G3.

## Gate check
| Gate | Status |
|------|--------|
| Keys never in Completions | Named (`key_material_in_context` → AgentDenied before attest/complete) |
| Sign outside model | Named (wallet/device/relayer/TEE; signed payload never re-enters model) |
| Fail-closed sanitizer/AgentDenied | Named |
| Custody boundary before sign path | §1 table — Pass |

## Answers to §11
1. **Spend cap on unsigned drafts — YES, required even in M4.** Unsigned drafts still social-engineer the human signer. Require env (or config) caps: per-intent and per-draft max amounts (token-decimal strings). Missing config ⇒ `env_unconfigured` / deny, not “unlimited.” Exact numeric defaults: Lead picks for testnet vs mainnet; PS wants *a* finite cap before G2 merge — do not ship uncapped.
2. **`simulate_intents` — FORBIDDEN until G3.** It consumes a *signed* payload; that is a sign-adjacent path. No signed-payload APIs in M4/G2.
3. **Secret-length-only for `ed25519:` — YES, OK.** Target secret-length base58 (existing ~80+ heuristic); do **not** reject public `ed25519:` keys needed for `view_access_key_list`. Keep PEM / BIP39 / hex_key_64+ / labeled private_key|seed fields. Public keys may still be redacted as today (`[REDACTED_KEY]`) when not in a relaxed envelope — fine.
4. **Hash+summary only into the model — PREFER YES (soft → treat as G2 default).** Completions transcript gets `draft_sha256` + host `human_summary` (and structured public fields already in the summary). Full `draft_json` stays host-side and is returned to the *outer caller* as the hand-off artefact; do not re-inject full draft into later Completions steps unless Lead overrides. Aligns with hash-then-sign.
5. **Env contract IDs — Lead selects network; PS reviews pinned values; AE does not invent.** Prefer a small checked-in profile (e.g. `intents_config.<network>.json` with verifier / MPC / token allowlist + `privacy_security_approver`) selected by env `INTENTS_NETWORK=testnet|mainnet`. Free-form inventing `intents.near` in code = DENY. Pin review = soft PS ack before first non-stub network use (can be G2 if fixtures are test-only mocks).

## Soft notes (non-blocking for G2)
- FORBIDDEN_TOOL_RE at register + execute: good.
- Host overrides `verifying_contract` / deadline / nonce: good; model-supplied contract ignored.
- Quote/solver paths remain UNTRUSTED; no auth tokens invented.
- Optional dry-run evidence in §9 is nice-to-have after G2 green, not a G1 blocker.

## Non-waivers
Abliterated REJECTED. CM / allowlist / `compose_file_sha256` unchanged by M4.

## Lead sync (same day)
Lead prefs confirmed; PS rules stand:
1. Cap: **yes** — `MAX_DRAFT_AMOUNT` ~**100 NEAR** start (env); missing ⇒ deny.
2. `simulate_intents`: **FORBIDDEN until G3**.
3. ed25519: **secret-length only**; public keys OK.
4. Hash+summary only to Completions: elevated from soft → **M4 HARD** (full `draft_json` host-side → outer caller only; never re-injected into model context).
5. Contract IDs: Lead `.env.example` **testnet-first**; PS reviews values at **G2**; **no hardcoded mainnet**.

**Pre-G2 blocker (Lead-flagged, PS agrees):** `FORBIDDEN_TOOL_RE` `/sign|…/i` must not match `propose_chain_signature` — AE renames tool or narrows regex before scaffold merge.

## Spend caps (Lead pick — PS accepted)
| Network | `MAX_DRAFT_AMOUNT` |
|---------|-------------------|
| testnet | **1000 NEAR** |
| mainnet | **10 NEAR** (strict until G3 spend policy) |

Env-driven from existing NEAR network config; amounts as decimal-string u128 yocto of those NEAR caps. Oversized ⇒ validation deny. Missing env/cap ⇒ deny (`env_unconfigured`).
