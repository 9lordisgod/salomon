# DRAFT — z-ai/glm-5.3-flash second instance 7bb9af0a

**STATUS: APPROVED** by Privacy Security 2026-10-29 — appended to `measurements.json` (second entry; first pin untouched). Approver=`Privacy Security`, effective_from=`2026-10-29T17:10:00Z`. See `SECURITY_SIGNOFF_PHASE2_SECOND_INSTANCE_GLM.md` + `APPROVED_z-ai_glm-5.3-flash_instance_7bb9af0a.entry.json`.

## Proposed entry (full hex) — `DRAFT_z-ai_glm-5.3-flash_instance_7bb9af0a.proposed.json`
| field | value |
|---|---|
| model_id | z-ai/glm-5.3-flash |
| rtmr3 | `e0f6c83eec48dfbfdb41d438a96783bcde1de18a1ac73705e2a8e24c2bc2051cbbf05ec0e856fed86498316a1b3e1bec` |
| mrconfigid | `015f7ebd85cf1f480a118f75dd10fd0cb277e4ddbb23845f1c20d8ea0f1e87efa6000000000000000000000000000000` |
| app_compose_sha256 | `5f7ebd85cf1f480a118f75dd10fd0cb277e4ddbb23845f1c20d8ea0f1e87efa6` (= info.compose_hash; expected_mrconfigid matches quote) |
| mrtd | `df4d77c857de652bd0fafa343a2026b51071ee03773d076d283abf1a7d36ff91ffa279ee4a617ac664f7e2a2c8d5891b` (same as pinned) |
| instance_id (notes) | `7bb9af0ac5b0e22dde3903218f58e56f743164a1` |
| app_id (notes) | `2c0a0c96cb6dbd659bf1446e2f3fce58172ff91b` (same as pinned) |

## Compose / CM
- CM offline verify: ok (both captures), quote TCB UpToDate, CM rtmr3 == model rtmr3, report_data == actions_hash+client nonce, actions_count 180, vm_config_image dstack-nvidia-0.5.12, app_name dstack-nvidia-0.5.11 (same naming skew as pinned).
- latest compose_up: 2026-10-29T00:11:24Z, file `prod/GLM-5.3-Flash-SGL-TP2x4-W4AFP8-V12Q8.yaml`, file_sha256 `904054f502ccdb2f913d6b80f156ea658b8bc5cb6f8af06082723581d62a45c0`, tag v0.0.521, commit 7ee4a4c741259d0c69a81e5cda22c3dfce21cbc2, services [proxy-glm53].
- CM images: compose-manager@sha256:6e035c8f…, bc44e44e…, a320bb48… (identical set to pinned).
- `grep -ril abliterat` over raw report/completion/signature for both captures: **0 hits**.

## Comparison to pinned instance 19aea169
| | pinned 19aea169 | draft 7bb9af0a |
|---|---|---|
| rtmr3 | 463b2e18… | e0f6c83e… (differs — instance-scoped) |
| mrconfigid / compose sha | a0e3c6f4… | 5f7ebd85… (differs — app_compose differs per instance) |
| mrtd | df4d77c8… | same |
| app_id | 2c0a0c96… | same |
| compose_up file/sha/tag/commit | 904054f5… v0.0.521 7ee4a4c7 | same |
| latest compose_up services | otelcol-contrib | proxy-glm53 |
| CM actions_count | 224 | 180 |

Open for PS: why app_compose_sha256 differs between instances with the same app_id/compose file (per-instance app_compose content); whether instance pins should be accepted per instance.

## Verification (offline, production plugs; `scripts/verifyRecorded.ts`)
Both captures: DCAP quote ok/UpToDate, RTMR3 replay matches, mrconfigid matches compose, report_data matches, gateway ok, NRAS ok, provider_tee signature exact-bytes + signer match + binder ok, CM ok.
- vs current `measurements.json` (sha256 0e84e254…, unchanged): **DENY [allowlist] no exact allowlist pin** (correct).
- vs temp file with this proposed entry (deleted after): PASS (positive control only).

Fixtures: `fixtures/recorded/z_ai_glm_5_3_flash_instance2{,_capture2}.{capture,verify}.meta.json`; raw under gitignored `fixtures/recorded/raw/`.

## PS APPROVED (2026-10-29 America/Vancouver)
See `../../SECURITY_SIGNOFF_PHASE2_SECOND_INSTANCE_GLM.md`. Compose skew = `INSTANCE_LABEL` gpu03 vs gpu04 only — accepted.
Append `APPROVED_z-ai_glm-5.3-flash_instance_7bb9af0a.entry.json` (do not replace first pin).
- `privacy_security_approver`: Privacy Security
- `effective_from`: 2026-10-29T17:10:00Z
