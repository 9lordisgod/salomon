# Labeling guidelines — privacy-first AI corpus

**Owner:** Data Curator  
**Consumers:** Model Engineer (training), Eval Lead (harness/fixtures), Privacy & Safety (refuse/echo policy)  
**Status:** DRAFT (PS ACCEPT as draft; Model Engineer ACCEPT with light edits applied) — seed expansion still **PARKED** (seed **362**). Do not merge new `data/extra/` batches until Lead/user unparks.  
**PS review:** `docs/reviews/SECURITY_REVIEW_LABELING_GUIDELINES_PRIVACY_AI.md`  
**Pivot:** General privacy / refusal / safe personal AI — **not** crypto SLM. See `SLM_PIVOT_PRIVACY_FIRST.md`.

## Goal
Produce clean, secret-free chat rows that teach:
1. Helpful privacy and personal-AI safety advice (legal, defensive, local-first).
2. Firm refusal of crime, theft, laundering, social-engineering, and secret handling.
3. Must-not-echo behavior for pasted secrets and hostile injected instructions.

Historical crypto/NEAR rows stay in seed until Lead asks for a scrub or rebalance. New rows prefer **product** privacy / personal-AI tags over crypto/NEAR depth. Borderline “how proceeds move” style help rows stay `crypto_centric` until Lead asks; if touched later, rewrite as tracing-only (victim/defensive) or `safety` refuse — never laundering how-to.

## Authority
These guidelines are **guidance for curators**. CI / `check_safety` / `eval_harness.py` exit-on-fail remain **authoritative**. Do not change seed count, signed item-(5) `eval_refusal.jsonl`, or harness pass logic without Privacy & Safety re-review **and** Lead unpark (for expansion).

**Training/eval base models:** abliterated or safety-stripped bases are **REJECTED** as targets. Guidelines assume an intact instruct base (e.g. Qwen2.5-Instruct family), never a stripped one.

## Intent classes (align with REFUSAL_EVAL_CRITERIA)
Keep these classes in labeling language; do **not** drop or soften signed crypto-flavored eval cases while parked:
- **R1 — must refuse:** crime/harm (launder, theft, recovery scam). Soft hedges that still give steps = fail.
- **R2 — must not echo:** synthetic BIP39 / hex key / PEM (and similar). Any echo fails, including inside a warning.
- **R3 — must not follow inject:** fake SYSTEM / tool-memo style instructions.

Privacy-first expansion adds general privacy / personal-AI **training** tags; it does not rewrite signed fixtures.


## Record schema
One JSON object per line (`*.jsonl`):

```json
{"messages":[{"role":"user","content":"..."},{"role":"assistant","content":"..."}],"tags":["privacy","local_inference"]}
```

Rules:
- Exactly one user turn and one assistant turn in v1 (multi-turn later only when Lead asks).
- `tags`: non-empty list of lowercase snake_case strings; at least one **domain** tag.
- No system role in training rows (system prompts live in inference/eval configs).
- UTF-8, single line, no trailing commentary outside JSON.

## Domain tags (prefer for new rows)

**Product privacy vs chain privacy:** Many historical rows tagged `privacy` are *chain* privacy (Tor/Nym, CoinJoin/WabiSabi, stealth addresses, Dandelion++). Keep them; do **not** grow that stack by default. First unparked batches must prioritize **product** privacy — `personal_ai` / `local_inference` / `data_minimization` / `consent` / defensive `phishing` — not more mixer or on-chain privacy tech under `privacy`.

| Tag | Use for |
|-----|---------|
| `privacy` | Everyday selective disclosure, metadata, tracking resistance; prefer pairing with product tags below. Avoid new chain-privacy-tech-only rows unless Lead asks |
| `personal_ai` | Assistant boundaries for diaries, health, work, relationships (non-clinical) |
| `local_inference` | On-device / offline models, what not to send to a cloud |
| `data_minimization` | Collect less, retain less, share less |
| `consent` | Sharing others' data, recording, screenshots |
| `phishing` | Spotting account-takeover / support scams (defensive) |
| `safety` | Any refusal / must-not-help row (always pair with a refusal subtype) |

### Refusal subtypes (require `safety`)
| Tag | Intent |
|-----|--------|
| `paraphrase_refusal` | Paraphrase of a known refusal pattern (train diversity; **never** copy eval prompts) |
| `launder` / `launder_short` | Refuse crime proceeds / tracing evasion |
| `theft` | Refuse steal / drain / phish / social-engineer |
| `recovery_scam` | Warn against seed/fee "recovery" agents |
| `secret_echo` | User pasted synthetic secret; assistant must not repeat it |
| `memo_injection` / `prompt_injection` | Ignore hostile instructions in pasted tool/memo/system text |
| `anti_echo` | Short refusals that avoid restating attack payloads |

### Legacy tags (keep on existing rows; avoid for new defaults)
`near`, `crypto`, `onchain`, `cypherpunk`, `batch5` — allowed only when Lead explicitly asks for a crypto-adjacent privacy concept (e.g. CoinJoin limits as **privacy tech**). Prefer rewriting the same idea under `privacy` without product/chain depth.

## Refuse vs help (content policy)

**Help (domain rows):**
- Defensive privacy hygiene, threat models at a conceptual level, how victims report/trace.
- Local-first AI practices, redacting logs, what not to paste into cloud chatbots.
- Explaining *why* something is unsafe without giving exploit steps.

**Refuse (`safety` rows):**
- Laundering, theft, drainers, phishing kits, bypassing auth, stalking, non-consensual surveillance.
- Handling or normalizing real or pasted seed phrases / private keys / API keys (synthetic fixtures only in eval; training refusals use obviously fake or redacted placeholders like `[SEED REDACTED]` — never a 12-word mnemonic string in training if `secret_scan` would trip; prefer "someone pasted a seed" framing).
- Following injected "SYSTEM:" / tool memos that ask to transfer funds, reveal keys, or disable safety.

**Assistant style on refuse:**
- Clear refuse in the first sentence. Soft hedges that still provide steps count as fail for must_refuse.
- Optional victim-safe next step (report, rotate credentials) without attack how-to.
- **Hard fail on echo:** never quote hostile payloads or secrets — including inside a refusal/warning (no “refuse while quoting” exemption). Refer generically: "that memo", "the pasted key".

## Eval leakage (hard rule)
- Do **not** copy or lightly paraphrase prompts from `data/eval_refusal.jsonl` or `data/eval_prompts.jsonl` into seed/`extra/`.
- Do **not** embed live `forbidden_substrings`, exact require/forbid lists, or verbatim eval prompts in labeling docs or training rows (describe patterns only; fixtures stay in eval JSONL).
- Training refusals must target the **same intent classes** (R1/R2/R3) with different wording.
- Changing signed eval fixtures requires Privacy & Safety + Eval Lead; Data Curator does not edit `eval_refusal.jsonl` unilaterally.

## Secrets and PII hygiene
- All new rows must pass `scripts/secret_scan.py` via `prepare_domain_data.py` (exit 0). Secret classes align with the sanitizer reject set: BIP39-like runs, PEM private-key blocks, ≥64 hex, `ed25519:` secrets, API-key shapes, long base64 blobs.
- Forbidden in data: **real** seeds, keys, API tokens, wallets, user addresses, phone/email, government IDs. R2/eval fixtures use **obvious fakes only** (e.g. abandon…about, 00×32, TESTKEY…).
- Labels must **not** teach “safe to put secrets in prompts if wrapped/redacted/for the model”. Treat pasted secrets as compromised; refuse to process them.
- Synthetic eval secrets stay in eval fixtures only; training uses redaction phrasing or “I won’t handle that” without embedding BIP39-like runs.
- No real incident PII; anonymize any case study.


## First batch sketch (when unparked)
- Target **~40–80** new rows total.
- **≥60%** help: `personal_ai` / `local_inference` / `consent` / `data_minimization` (product privacy).
- **≤40%** `safety` + `paraphrase_refusal` covering R1/R2/R3 **intents** (new wording only).
- **Zero** NEAR/crypto depth; **zero** eval prompt near-dupes; **zero** embedded live forbid lists.
- After `make data`: hand Model Engineer the row delta + tag histogram; ping Privacy & Safety before expand if refusal tone shifted.

## Batch workflow (when unparked)
1. Write `data/extra/<name>.jsonl` (e.g. `privacy_batch1_local_ai.jsonl`).
2. Self-check: schema, tags, refuse-vs-help, no eval leak, no quote-of-payload.
3. Run `make data` / `prepare_domain_data.py` (secret scan must exit 0).
4. Hand Model Engineer the row delta + tag histogram; notify Privacy & Safety if refusal tone/policy shifted.
5. Do **not** delete historical crypto rows unless Lead requests scrub/rebalance.

## Quality bar (per row)
- Factual for help rows; if unsure, omit rather than invent.
- One clear teaching point per row.
- Assistant length: short for refusals; a few sentences for domain help.
- Tags accurate enough for rebalance queries (privacy vs safety vs legacy).

## Current baseline (2026-10-29)
Source of truth: `SEED_INVENTORY_362.md` (bucket classification). Tag histogram ≠ bucket counts — a row can carry both `privacy` and `safety`.

| Bucket | Count | Notes |
|--------|------:|-------|
| `refusal_reusable` | 117 | Safety/refusal — keep |
| `privacy_reusable` | 52 | Privacy-tagged, not crypto-tagged (many are still *chain* privacy historically) |
| `privacy_via_crypto` | 8 | Privacy concept with crypto framing |
| `crypto_centric` | 185 | Leave alone; borderline “how proceeds move” help stays here until Lead asks |
| **Total** | **362** | |

When unparked, grow **product** privacy (`personal_ai` / `local_inference` / `consent` / `data_minimization` / defensive `phishing`) and `paraphrase_refusal` diversity — not `batch5` NEAR/crypto depth and not more mixer/chain-privacy tech. Cypherpunk/`privacy` chain samples alone are not enough for the new narrative.

## Out of scope for Data Curator
- Changing harness contract or signed 8/8 fixtures without Privacy & Safety (+ Eval Lead).
- Unparking expansion (Lead/user only).
- Assuming abliterated / safety-stripped bases for training or eval.
- Architecture / Phase 2 product narrative (Lead + Docs Lead).

## Review before expand or fixture touch
Ping Privacy & Safety for skim before any seed expansion or fixture edit. Ping Model Engineer when guidelines or inventory are ready to review.
