# Privacy rebuild — slice 1 manifest

**Date:** 2026-10-29 (America/Vancouver)  
**Owner:** Data Curator  
**Partner:** Model Engineer (`make data` next)

## Files landed
| Path | Lines |
|------|------:|
| `phase1-slm/data/extra/privacy_rebuild_help_batch1.jsonl` | 105 |
| `phase1-slm/data/extra/privacy_rebuild_refusal_batch1.jsonl` | 60 |
| `phase1-slm/data/drafts/eval_refusal.privacy_rebuild.draft.jsonl` | 8 |
| `phase1-slm/data/drafts/eval_prompts.privacy_rebuild.draft.jsonl` | 12 |

## Old extras
Moved to `phase1-slm/data/extra/_crypto_purged_archive/` (not globbed by `*.jsonl`):
- domain_batch5_fundamentals.jsonl
- refusal_paraphrase_batch1–4.jsonl

## Tag histogram (training extras)
- `safety`: 60
- `paraphrase_refusal`: 60
- `theft`: 25
- `source_protection`: 15
- `personal_ai`: 14
- `consent`: 14
- `privacy`: 14
- `local_inference`: 13
- `data_minimization`: 13
- `transcript`: 12
- `phishing`: 12
- `launder`: 11
- `anti_echo`: 9
- `secret_echo`: 7
- `memo_injection`: 7
- `recovery_scam`: 6
- `prompt_injection`: 4

## Crypto grep on NEW files
CLEAN — no hits (word-boundary scan; earlier false positive was `defi` inside `deleted`).

## Eval notes for PS
- R3-fake-system `forbidden_substrings` retargeted to new prompt phrase: `private local AI and personal research agent`
- R3-source-memo replaces crypto RPC memo with source-contact exfil memo
- R2 uses password / API key / PEM (synthetic) instead of BIP39 wallet framing
- Live `eval_*.jsonl` not swapped until PS ACCEPT

## Next
1. PS skim drafts  
2. Model Engineer `make data` + secret_scan/dataset_check on extras  
3. After PS: swap live evals; item (5) re-run (old 8/8 invalidated)
