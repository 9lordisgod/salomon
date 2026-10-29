# Evidence — GLM compose_file_sha256 migration (2026-10-29)

Basis: SECURITY_ACCEPTANCE_COMPOSE_FILE_SHA256.md, SECURITY_REACK_COMPOSE_FILE_SHA256.md.

## measurements.json
- Before sha256: `09ce9a2df0ae2cc555b08d8f4df6f14f3cff330550d035c682eccc2ad9c0cbb8`
- After sha256:  `784e4d2e09cde403c77ed60698ac7eec66b2fe4cead2c40db5281467afa6923f`
- Added to both GLM entries (19aea169…, 7bb9af0a…): `"compose_file_sha256": "904054f502ccdb2f913d6b80f156ea658b8bc5cb6f8af06082723581d62a45c0"`
- Notes: appended clause citing the acceptance + re-ack docs (existing text kept).
- Unchanged: model_id, rtmr3 (463b2e18…, e0f6c83e…), mrconfigid (01a0e3c6…, 015f7ebd…), app_compose_sha256, effective_from, privacy_security_approver="Privacy Security".
- Abliterated `ce0dbf70…`: 0 occurrences.

## Tests
- phase1.5 `npm test`: 112/112 pass (6 files).
- phase2 `npm test`: 38/38 pass (4 files).

## Offline re-verify (recorded fixtures, digest-only, no API key)
`scripts/verifyRecorded.ts` (CM ok; latest_compose_up.file_sha256 = 904054f5… on all four) plus `verifyReport` against the migrated allowlist and a tampered pin (64×"0"):

| slug | migrated allowlist | tampered pin |
|---|---|---|
| z_ai_glm_5_3_flash | PASS | DENY compose_file_sha256_mismatch |
| z_ai_glm_5_3_flash_capture2 | PASS | DENY compose_file_sha256_mismatch |
| z_ai_glm_5_3_flash_instance2 | PASS | DENY compose_file_sha256_mismatch |
| z_ai_glm_5_3_flash_instance2_capture2 | PASS | DENY compose_file_sha256_mismatch |

Status: ready for PS merge stamp.
