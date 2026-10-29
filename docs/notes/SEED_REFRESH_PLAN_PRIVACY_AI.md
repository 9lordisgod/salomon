# Seed refresh plan — privacy-first AI (execute on unpark)

**Owner:** Data Curator  
**Status:** PLAN ONLY — expansion **PARKED**. Do not merge `data/extra/` until Lead/user says **unpark**.  
**Depends on:** `LABELING_GUIDELINES_PRIVACY_AI.md`, `SEED_INVENTORY_362.md`, `SLM_PIVOT_PRIVACY_FIRST.md`  
**Consumers:** Model Engineer (train), Privacy & Safety + Eval Lead (fixtures stay signed unless they approve change)

## Non-goals (this plan)
- No mass delete or silent scrub of historical crypto/NEAR rows.
- No edits to signed item-(5) `eval_refusal.jsonl` / harness pass logic.
- No NEAR/crypto depth batches (no “batch6 NEAR”) as the default path.
- No abliterated / safety-stripped base assumptions.

## Starting point
| Bucket | Count | Action on unpark |
|--------|------:|------------------|
| refusal_reusable | 117 | Keep; add paraphrases (no eval leak) |
| privacy_reusable | 52 | Keep; grow hard |
| privacy_via_crypto | 8 | Keep; optional later rewrite under `privacy` |
| crypto_centric | 185 | Keep until Lead asks scrub/rebalance |
| **Total seed** | **362** | |

## Target after first unpark slice
Grow seed by a **small curated batch**, not a rush to 2k:

| New file (proposed) | Share | Focus tags |
|--------------------|------|------------|
| `data/extra/privacy_batch1_local_personal_ai.jsonl` | ≥60% of batch | `personal_ai`, `local_inference`, `data_minimization`, `consent` (product privacy — not mixer/chain-privacy tech) |
| `data/extra/refusal_paraphrase_batch5_privacy.jsonl` | ≤40% of batch | `safety` + `paraphrase_refusal` (+ subtypes); R1/R2/R3 **intents**, new wording |

**Batch size:** ~40–80 new rows total. **Expected seed after merge:** ~400–440 (exact after `make data`). Reassess before any larger wave.

**Product vs chain:** do not grow Tor/CoinJoin/stealth/Dandelion-style *chain* privacy under `privacy` in this slice; historical chain-privacy rows stay as-is.

## Content themes (batch 1)
**Help rows (product privacy):** local vs cloud chat risks; what not to paste into assistants; logging/retention minimization; consent before sharing others’ data; defensive phishing/support-scam recognition; everyday metadata leakage. Not more CoinJoin/Tor/stealth tech tutorials.

**Refusal rows:** launder/theft/recovery-scam paraphrases; “pasted secret” handling without embedding BIP39-like strings; ignore fake SYSTEM / tool-memo injects — refuse without quoting payloads.

## Quality gates before merge
1. Schema + tags per labeling guidelines.
2. `prepare_domain_data.py` / `secret_scan` exit 0; `dataset_check.py` clean.
3. No overlap with eval prompts / no embedded `forbidden_substrings`.
4. PS skim if refusal tone shifted; Model Engineer gets delta + tag histogram.
5. Item (5) fixtures untouched unless PS + Eval Lead + Lead explicitly open that work.

## Later (only if Lead asks)
- Retag/rewrite `privacy_via_crypto` → clean `privacy`.
- Rebalance / archive subset of `crypto_centric` (never silent mass delete).
- Multi-turn rows; larger corpus toward 2k+.
- Broaden refusal **fixtures** beyond crypto-flavored cases (PS-owned acceptance).

## Unpark checklist
- [ ] Lead/user: **unpark**
- [ ] Guidelines status: accepted or edit list applied
- [ ] Write two `extra/` JSONL files above
- [ ] `make data` + secret/schema checks green
- [ ] Notify Model Engineer + PS
- [ ] Update STATUS/PROGRESS via Docs Lead if they want a line

