# Evidence — G4 (CM required) + model probe + GLM re-capture (digest-only)
Item 6 NOT APPROVED. `allowlist/measurements.json` = `{"entries":[]}`. API key loaded only from `.env`, never printed.

## G4
- `src/verify.ts`: absent/null `compose_manager_attestation` ⇒ DENY check `compose_manager`, reason `compose_manager_missing`; present ⇒ G1 verify (fail ⇒ DENY).
- Tests: `test/composeManager.test.ts` "G4 … CM absent ⇒ DENY" (absent + null); present+ok and present+fail retained. `test/attestation.test.ts` fixtures now carry a mock CM.
- `npm test` 101/101, `tsc --noEmit` clean. DESIGN.md / DESIGN_REAL_PLUGS.md / drafts say "CM required".

## Probe (scripts/probeAbliterated.mjs; 2026-10-29 ~09:10 PDT)
Attested (200, gateway+model+NVIDIA+CM present); everything else in /v1/models returned 503 (no TEE report).
| model_id | latest compose_up | abliterated |
|---|---|---|
| deepseek-ai/DeepSeek-V4.1-Flash-1017 | prod/DeepSeek-V4.1-Flash-1017-vLLM-DEP8-Abliterated.yaml | YES (rejected) |
| Qwen/Qwen3.8-27B | prod/qwen38-27b-abliterated-cc-1gpu.yaml | YES (rejected) |
| z-ai/glm-5.3-flash | prod/GLM-5.3-Flash-SGL-TP2x4-W4AFP8-V12Q8.yaml | no — **chosen** |
| Qwen/Qwen3.6-35B-A3B-FP8 | prod/small-models.yaml (shared) | no |
| Qwen/Qwen3-VL-30B-A3B-Instruct | prod/small-models.yaml (shared) | no |
| openai/privacy-filter, openai/whisper-large-v3, Qwen/Qwen3-Embedding-0.6B, Qwen/Qwen3-Reranker-0.6B, black-forest-labs/FLUX.2-klein-4B | prod/small-models.yaml (shared) | no |
No non-abliterated DeepSeek-V4.1-Flash-1017 is offered (other deepseek ids 503). GLM chosen: dedicated compose, chat LLM; small-models share one CVM across many models.

## Re-capture
- `fixtures/recorded/z_ai_glm_5_3_flash.capture.meta.json`, `.verify.meta.json`; raw (gitignored) `fixtures/recorded/raw/z_ai_glm_5_3_flash.*` (report, nonce, completion req/resp, signature). Statuses 200/200/200; DCAP UpToDate, RTMR3 replay match, CM report_data = actions_hash‖nonce, NRAS ok, provider_tee ecdsa ok; empty allowlist ⇒ DENY allowlist_load (expected).
- Draft: `allowlist/DRAFT_z-ai_glm-5.3-flash.md`.

## GLM capture2 — instance-pin confirmation (G2-style), 2026-10-29

Model `z-ai/glm-5.3-flash`, fresh nonce. Key loaded from `.env` only; it doesn't appear in fixtures or logs (grep shows 0 hits).
- Meta: `fixtures/recorded/z_ai_glm_5_3_flash_capture2.capture.meta.json`, `fixtures/recorded/z_ai_glm_5_3_flash_capture2.verify.meta.json`. Raw files are in gitignored `fixtures/recorded/raw/z_ai_glm_5_3_flash_capture2.*`.
- API: report/completion/signature all returned 200.
- Offline verify passed: model quote is DCAP UpToDate, RTMR3 replay matches, mrconfigid/compose matches, report_data matches, NRAS ok, provider_tee ecdsa binder ok, gateway ok. **Compose-manager is present, DCAP-verified and UpToDate, so the G4 CM-required check passes.** `verifyReport` with an empty allowlist ⇒ DENY (deny-all).
- Not abliterated: the raw report has 0 matches for `abliterat`. Latest compose_up is `prod/GLM-5.3-Flash-SGL-TP2x4-W4AFP8-V12Q8.yaml`, the same as capture1.
- **These values are SAME as capture1:** RTMR3 `463b2e18…82277d6`, MRTD, mrconfigid, app_compose_sha256 `a0e3c6f4…`, instance-id `19aea169…bde8d66d`, app-id `2c0a0c96…72ff91b`, and the latest compose file/sha. The quote sha differs because the nonce is fresh, which is expected.
- Conclusion: there is one instance, so one instance-scoped pin applies. A redeploy will need a new PS entry. `measurements.json` remains `{"entries":[]}`.

## AE merge — measurements.json (2026-10-29)

Appended the exact PS entry from `allowlist/APPROVED_z-ai_glm-5.3-flash.entry.json` into `allowlist/measurements.json` (one object, not `test_only`). Tests updated: shipped-allowlist assertions now expect the GLM pin; empty deny-all still covered via temp `EMPTY_AL`. `npm test` 101/101; `tsc --noEmit` clean. Workspace tree is not a git repo and `gh` is not logged in — no GitHub PR opened from this box; file merge is present for Lead/PS. Phase 2 still Lead-gated.
