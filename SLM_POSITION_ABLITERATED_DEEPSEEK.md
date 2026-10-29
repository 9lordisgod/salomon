# SLM position — Abliterated DeepSeek compose (item 6 / G3)

**Author:** SLM Engineer (Phase 1)  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Audience:** Lead Architect, Agent Engineer, Privacy Security  
**Refs:** `SECURITY_SIGNOFF_PRE_PHASE2_ITEM6_DRAFT_REVIEW.md` G3; draft `phase1.5-attestation/allowlist/DRAFT_deepseek-ai_DeepSeek-V4.1-Flash-1017.md`; Phase 1 refusal suite (`REFUSAL_EVAL_CRITERIA.md`, `SECURITY_SIGNOFF_REFUSAL_7B.md`, `SECURITY_SIGNOFF_R3_NEARECHO_DELTA.md`)

## Decision (SLM)
**Do not accept Abliterated for the privacy product path.**  
No SLM written accept for `prod/DeepSeek-V4.1-Flash-1017-vLLM-DEP8-Abliterated.yaml` / `proxy-dsv41-abliterated` as a production privacy pin.

## Why (Phase 1 refusal bar)
- Phase 1.5 item (5) and the R3 near-echo delta require a model that **refuses** laundering/theft, does **not echo** secrets, and does **not** follow injected tool/SYSTEM attacks under a fail-closed harness.
- “Abliterated” stacks are built to **remove or weaken refusal / safety alignment**. That is a direct conflict with the refusal bar we just signed off on Qwen2.5-7B-Instruct (8/8 + R3 delta cleared).
- Attestation proving an Abliterated compose ran does **not** make that workload acceptable for a privacy product that markets refusal and anti-injection behavior.
- Pinning Abliterated would also make Phase 2 tool loops harder to defend: the same suite that gates the SLM would be expected to fail or be waived on the remote path.

## Recommendation
1. **Prefer a non-abliterated attested capture** of the same canonical `model_id` (`deepseek-ai/DeepSeek-V4.1-Flash-1017`) with compose/service names that are **not** Abliterated (no `…Abliterated.yaml`, no `proxy-*-abliterated`), **or** pick another NEAR Cloud model_id that has a non-abliterated attested stack and re-run item (6) evidence.
2. Keep `measurements.json` empty (deny-all) until that capture exists **and** Privacy Security approves a non-`test_only` entry.
3. If Lead later wants Abliterated for a **non-privacy / research-only** path, that must be an explicit product exception with a separate allowlist notes field — **not** the default privacy pin. SLM still recommends against mixing it into the privacy agent default.

## What SLM is not claiming
- This is not a DCAP/compose-manager verdict (G1/G2 stay with AE + PS).
- This does not open Phase 2 or waive allowlist / `provider_tee` blockers.
- This does not change item (5) or the R3 near-echo clearance.

## Ask of Lead
Confirm (or override in writing) this reject. Until Lead writes an accept, treat Abliterated as **unacceptable** for the privacy product allowlist entry.

## Lead confirmation
**Lead Architect (master dev), Thu Oct 29, 2026:** Confirmed in writing — **REJECT Abliterated** for the privacy product path. No Lead accept; no override of this SLM position. First production pin must be non-abliterated (same `model_id` if NEAR exposes a non-abliterated compose, else another attested TEE model_id).
