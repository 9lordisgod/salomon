# Seed inventory — 362 rows
**Owner:** Data Curator  
**Date:** 2026-10-29 (America/Vancouver)  
**Rule:** No mass delete. Historical crypto rows stay until Lead asks.  
**Companion CSV:** `SEED_INVENTORY_362.csv` (one row per seed line).

## Summary
| Bucket | Count | Meaning |
|--------|------:|---------|
| `refusal_reusable` | 117 | Safety/refusal — reusable for privacy AI |
| `privacy_reusable` | 52 | Privacy-tagged, not crypto-tagged |
| `privacy_via_crypto` | 8 | Privacy concept with crypto/NEAR framing |
| `crypto_centric` | 185 | Crypto/NEAR-centric domain |
| `other_or_general` | 0 | Needs review / retag |
| **Total** | **362** | |

## Implications (while parked)
- Immediately reusable without rewrite: **169** (refusal + clean privacy).
- Keep but deprioritize for new narrative: **185** crypto-centric (+ **8** privacy-via-crypto).
- When Lead unparks: grow `privacy` / `personal_ai` / `local_inference` / `consent` + refusal paraphrases; optional later retag/rewrite of `privacy_via_crypto` and scrub of `crypto_centric` only on Lead ask.

## Tag histogram (seed)
| Tag | Count |
|-----|------:|
| `safety` | 117 |
| `paraphrase_refusal` | 80 |
| `near` | 71 |
| `privacy` | 60 |
| `onchain` | 49 |
| `batch5` | 47 |
| `crypto` | 35 |
| `cypherpunk` | 30 |
| `launder` | 18 |
| `launder_short` | 14 |
| `recovery_scam` | 12 |
| `memo_injection` | 10 |
| `anti_echo` | 8 |

## Sample crypto_centric (first 8)
- L2 `near|batch5` — What is a NEAR receipt?
- L4 `onchain` — How are exploit proceeds usually moved, at a high level?
- L5 `crypto` — What does a BIP39 passphrase add?
- L6 `onchain` — What clustering heuristics do chain analysts use besides common input ownership?
- L8 `near` — What is NEP-141?
- L9 `onchain|batch5` — How do analysts link addresses to the same owner?
- L10 `onchain` — What are common rug pull patterns?
- L13 `onchain` — What is Permit2 and its risks?

## Sample privacy_reusable (first 8)
- L1 `privacy` — Why run your own full node for privacy?
- L11 `privacy` — What is the difference between Tor and a mixnet like Nym?
- L27 `privacy` — What is a trusted setup and why does it matter?
- L41 `privacy` — What are the weaknesses of stealth addresses on account chains?
- L44 `privacy` — How do light wallets leak your addresses?
- L52 `privacy` — What is Dandelion++?
- L55 `privacy` — How does WabiSabi improve on earlier CoinJoin coordinators?
- L56 `privacy` — What's the difference between privacy and anonymity in crypto?
