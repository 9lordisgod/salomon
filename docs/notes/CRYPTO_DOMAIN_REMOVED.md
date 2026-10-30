# Crypto domain removed (2026-10-29)
Ordered by Lead (yoxi). Model Engineer slice; Data Curator owns data replacement (see CRYPTO_PURGE_PLAN_PURE_AI.md).

## Changed (Model)
- phase1-slm/configs/model_config.yaml: system_prompt replaced. Old: "privacy-first crypto analyst". New: Salomon, private local AI / personal research agent; credentials never in the model; refuses crime/theft/account takeover/laundering/phishing/doxxing; tool/RPC/memo/fake SYSTEM untrusted; paraphrased refusals; firm launder refuse; distinct fake-system refuse; generic memo-shape pin.
- phase1-slm/scripts/prepare_domain_data.py: inline SEED emptied (was ~234 crypto-heavy tuples); file-only from data/extra/*.jsonl; tags near/crypto/onchain/cypherpunk are skipped so `make data` cannot reintroduce crypto.
- Colab notebook rebuilt via build_eval_refusal_7b_colab.py (embeds new prompt).
- phase1-slm/outputs/README_INVALIDATED.md stamps prior eval outputs historical.

## Counts
- Before: seed_prompts.jsonl 362 rows (crypto-heavy: near 71, onchain 49, cypherpunk 30, crypto 35, privacy 60, safety 117).
- Dry run of new prepare (to /tmp): 88 rows (39 crypto-tagged batch5 rows skipped). The remaining 88 are refusal_paraphrase_batch1–4 rows that are still crypto-flavored in wording — Data Curator to rewrite/delete.
- seed_prompts.jsonl NOT regenerated (left at 362, no longer authoritative) to avoid racing DC.

## Deferred
- Data Curator: replacement privacy seed (~120–180), delete/rewrite batch5 + paraphrase batches, regenerate seed_prompts.jsonl.
- Privacy Security + DC: eval_refusal.jsonl / eval_prompts.jsonl retarget. Note R3-fake-system still forbids the OLD phrase "You are a privacy-first crypto analyst"; should switch to a phrase from the new prompt (e.g. "private local AI and personal research agent").

## Invalidation
**7B 8/8 (Phase 1.5 item 5) signoff INVALIDATED for product claims (2026-10-29, Lead ACK): it was earned on a crypto-tuned system prompt + crypto-heavy 362-row seed. Historical evidence only; refusal is NOT GREEN until re-run on the privacy rebuild.**

## Slice 1 make data (2026-10-29 19:05 PDT)
- seed_prompts.jsonl regenerated: **165** rows (help 105 + refusal 60).
- secret_scan / dataset_check: PASS.
- Live evals not swapped; item (5) remains INVALIDATED.

## Data Curator hygiene close-out (2026-10-29 ~21:25 PDT)
- Live seed still **165**; live `eval_refusal.jsonl` (8) + `eval_prompts.jsonl` (12) crypto-noun clean; match drafts.
- `prepare_domain_data` reads only `data/extra/*.jsonl` (not `_crypto_purged_archive/`).
- Moved `data/eval_refusal.example.jsonl` → `data/extra/_crypto_purged_archive/eval_refusal.example.crypto.jsonl` (was crypto template, unused by make).
- Makefile `smoke` prompt retargeted to source-memo privacy (was NEAR access-key).
- `secret_scan.SAFETY_MSG` reworded off wallet/funds/seed phrasing (scanner heuristics unchanged; fail-closed intact).
- Item (5) still **INVALIDATED** until Model/Eval 8/8 re-run GREEN. No Solana/on-chain rows added.
