# SLM pivot — privacy-first AI (not crypto)

**When:** 2026-10-29 ~15:16 PDT  
**Source:** Lead (master dev) / user  
**Owner:** SLM Engineer (domain data + refusal when unparked)

## Decision
Project is **privacy-first AI**, not a crypto SLM product.

| Was (crypto-centric) | Now (privacy-first) |
|---|---|
| Domain data: crypto, on-chain, NEAR NEPs, cypherpunk finance framing | Domain data: general **privacy**, **refusal**, **safe personal AI** |
| Dataset expansion → 2k crypto/NEAR rows + multi-turn | When **unparked**: expand as **privacy AI** corpus (not crypto SLM) |
| Narrative includes NEAR AI Cloud remote TEE path | **NEAR AI Cloud out of narrative** (do not pitch or plan domain data around it) |

## Still true (unchanged)
- Dataset expansion remains **PARKED** until Lead/user unparks (seed **362**).
- Gate item **(5)** stays **SIGNED** (Qwen 7B Colab 8/8 refusal / must-not-echo).
- Soft GLM live refusal stamp unchanged; does not replace item (5).
- Never put raw private keys in models.
- Refusal harness + `check_safety` fail-closed stay in force; fixtures may later broaden beyond crypto-flavored cases when Lead asks.

## SLM actions when unparked
1. Prefer new rows tagged for privacy / personal-AI safety / refusal over crypto/NEAR fundamentals.
2. Do not schedule batch6 “NEAR dev depth” or crypto multi-turn as the default expansion path.
3. Coordinate with Privacy Security before changing refusal fixtures that item (5) signed against.
4. Leave historical crypto seed rows in place until Lead asks for a scrub or rebalance (no silent mass delete while parked).

## Out of SLM scope
Architecture / Phase 2–3 product narrative rewrite beyond this note — Lead + Tech Docs. SLM will not assume NEAR AI Cloud in future domain-data plans.
