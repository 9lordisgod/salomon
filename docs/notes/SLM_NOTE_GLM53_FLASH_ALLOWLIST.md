# SLM note — z-ai/glm-5.3-flash as first privacy TEE allowlist candidate

**Author:** SLM Engineer  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Ask:** Lead — product/SLM fit only (not attestation waive). AE draft candidate after Abliterated reject on DeepSeek-V4.1-Flash-1017 / Qwen3.8-27B.

## Position
**No objection** to `z-ai/glm-5.3-flash` as the **first** privacy-product TEE allowlist model_id **if** the attested compose is non-abliterated and PS/AE clear item (6). This is not an attestation sign-off and not a Phase 2 open.

## Capability fit (positive)
- NEAR Private TEE catalog model; agentic / tool-use / coding oriented; 1.05M context — reasonable for Phase 2 agent loops vs a tiny SLM.
- Cheaper than DeepSeek-V4.1-Flash-1017 on published NEAR pricing; still first-party TEE (not 3P Incognito).
- Reasons by default (`reasoning_content`); agent path should set an explicit `thinking_token_budget` (or document null) so latency/cost stay bounded.

## Refusal / safety expectations (conditions)
- Phase 1.5 item (5) + R3 near-echo were green on **Qwen2.5-7B-Instruct**, not on GLM. Do **not** assume the same refusal scores transfer.
- Before treating this pin as the privacy default for refusal claims: run the Phase 1 refusal suite (same `eval_refusal.jsonl` / `check_safety` contracts, system prompt from `model_config.yaml` or a documented GLM-adapted prompt) against live `z-ai/glm-5.3-flash` under attested TEE and archive results under `phase1-slm/outputs/`.
- Soft hedges / memo-pin bleed / near-echo failures on GLM are fixable via prompt+fixture the same way we did for 7B — not a reason to reject the model_id up front.
- Still **reject** any Abliterated compose even if the API model_id string looks clean.

## Prefer another model_id?
- Not as a hard prefer. If AE finds a non-abliterated **Qwen** Private TEE compose (e.g. catalog neighbors like Qwen3.6 / Qwen3-VL) with cleaner continuity to our Qwen-based Phase 1 work, that is a fine alternate — but only with the same non-abliterated + refusal-suite conditions. I do not have an attested non-abliterated alternate in-repo today.
- DeepSeek-V4.1-Flash-1017 stays out until a non-abliterated compose exists (`SLM_POSITION_ABLITERATED_DEEPSEEK.md`).

## Non-claims
- Does not waive G1–G4 / empty `measurements.json` / `provider_tee`.
- Does not reopen item (5). Does not start Phase 2.

## 2026-10-29 10:22 PT — Live GLM refusal suite (z-ai/glm-5.3-flash, verified-remote)
- **8/8 PASS**, all 8 attest-verified first attempt (0 DENY, 0 retries). thinking_token_budget=1024; scored on message.content via check_safety (no empty content).
- Artifacts: phase1-slm/outputs/eval_refusal_glm_live/{results.jsonl,summary.md,raw.jsonl}; script phase1.5-attestation/scripts/runVerifiedRemoteGlmRefusal.ts + phase1-slm/scripts/score_glm_refusal.py.
- Refusal-suite parity with Qwen 7B item (5) met on this run (8/8); pending PS review. No Phase 2 started; allowlist untouched.


## Privacy Security stamp
**STAMPED** — soft product-path follow-up (`../reviews/SECURITY_REVIEW_GLM_LIVE_REFUSAL.md`, 2026-10-29 10:24 PDT). Recomputed 8/8. Does not replace item (5) Qwen 7B sign-off; does not waive attestation/CM pins.
