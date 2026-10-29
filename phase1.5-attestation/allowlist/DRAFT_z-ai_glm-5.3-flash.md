# DRAFT allowlist entry — z-ai/glm-5.3-flash (NOT LOADABLE; NOT APPROVED)
Status: **APPROVED** by Privacy Security 2026-10-29. Merged into `measurements.json` (one entry; not `test_only`). Approver=`Privacy Security`, effective_from=`2026-10-29T17:00:00Z`. See `SECURITY_SIGNOFF_PRE_PHASE2_ITEM6_GLM.md` + `APPROVED_z-ai_glm-5.3-flash.entry.json`. Phase 2 still Lead-gated.
Replaces the rejected Abliterated DeepSeek draft per Lead G3 ruling (Abliterated rejected entirely).

Proposed AllowlistEntry values (from genuine capture 2026-10-29, offline re-verify green):
- model_id: `z-ai/glm-5.3-flash`
- mrconfigid: `01a0e3c6f4f21a60ea3f5c96bc7ef319b03a184ca2049605399275fbcea74e8c5f000000000000000000000000000000`
- rtmr3: `463b2e18f0dde370e2be8d6b4cb07aac5efc4d8bc712cea2714d103e4db57cea4ce50197973d557306b25e70f82277d6` (instance-scoped)
- mrtd (record): `df4d77c857de652bd0fafa343a2026b51071ee03773d076d283abf1a7d36ff91ffa279ee4a617ac664f7e2a2c8d5891b`
- app_compose_sha256 / imr3 digests: see `fixtures/recorded/z_ai_glm_5_3_flash.verify.meta.json`
- gpu_evidence_sha256: omitted (per-request evidence)
- privacy_security_approver: UNSET; effective_from: UNSET (PS sets)

Notes for entry (draft):
- **CM required** (G4: absent ⇒ DENY `compose_manager_missing`).
- Instance-scoped: instance_id `19aea1693533dc2d529db03e3f725f20bde8d66d`, app_id `2c0a0c96cb6dbd659bf1446e2f3fce58172ff91b`; redeploy ⇒ new PS entry.
- Latest model compose_up: `prod/GLM-5.3-Flash-SGL-TP2x4-W4AFP8-V12Q8.yaml` file_sha256 `904054f502ccdb2f913d6b80f156ea658b8bc5cb6f8af06082723581d62a45c0`, tag `v0.0.521`, commit `7ee4a4c741259d0c69a81e5cda22c3dfce21cbc2` (services model-sg-glm53-w4afp8-tp2-r1..r4 + otelcol-contrib). No "abliterat" string anywhere in report.
- History: 224 CM actions incl. earlier `…-V8KdaCanary.yaml` ups; 3 compose-manager image digests; vm_config `dstack-nvidia-0.5.12`.
- TCB UpToDate, no advisories; gateway/NRAS/provider_tee ecdsa all ok.

Open for PS: capture2 confirms same instance pin (see below). Weigh pinning `compose_file_sha256`. SLM: no objection for first privacy pin if non-abliterated; refusal-suite on this model_id is a soft follow-up (Phase 1 green was Qwen2.5-7B) — see `../SLM_NOTE_GLM53_FLASH_ALLOWLIST.md` (repo root).

## Capture2 comparison (instance-pin confirmation)

Model `z-ai/glm-5.3-flash`, fresh nonce. Key loaded from `.env` only; it doesn't appear in fixtures or logs (grep shows 0 hits).
- Meta: `fixtures/recorded/z_ai_glm_5_3_flash_capture2.capture.meta.json`, `fixtures/recorded/z_ai_glm_5_3_flash_capture2.verify.meta.json`. Raw files are in gitignored `fixtures/recorded/raw/z_ai_glm_5_3_flash_capture2.*`.
- API: report/completion/signature all returned 200.
- Offline verify passed: model quote is DCAP UpToDate, RTMR3 replay matches, mrconfigid/compose matches, report_data matches, NRAS ok, provider_tee ecdsa binder ok, gateway ok. **Compose-manager is present, DCAP-verified and UpToDate, so the G4 CM-required check passes.** `verifyReport` with an empty allowlist ⇒ DENY (deny-all).
- Not abliterated: the raw report has 0 matches for `abliterat`. Latest compose_up is `prod/GLM-5.3-Flash-SGL-TP2x4-W4AFP8-V12Q8.yaml`, the same as capture1.
- **These values are SAME as capture1:** RTMR3 `463b2e18…82277d6`, MRTD, mrconfigid, app_compose_sha256 `a0e3c6f4…`, instance-id `19aea169…bde8d66d`, app-id `2c0a0c96…72ff91b`, and the latest compose file/sha. The quote sha differs because the nonce is fresh, which is expected.
- Conclusion: there is one instance, so one instance-scoped pin applies. A redeploy will need a new PS entry. `measurements.json` remains `{"entries":[]}`.

## PS APPROVED (2026-10-29 America/Vancouver)
See `../../SECURITY_SIGNOFF_PRE_PHASE2_ITEM6_GLM.md`. Append exact entry from `APPROVED_z-ai_glm-5.3-flash.entry.json` via PR only.
- `privacy_security_approver`: Privacy Security
- `effective_from`: 2026-10-29T17:00:00Z
- Capture2 confirmed same instance pins. G4 signed off.
- Do not merge Abliterated DeepSeek. Phase 2 still Lead-gated.
