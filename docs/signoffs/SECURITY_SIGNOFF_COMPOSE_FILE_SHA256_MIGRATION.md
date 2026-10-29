# Merge stamp — GLM `compose_file_sha256` migration
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Basis:** `../reviews/SECURITY_ACCEPTANCE_COMPOSE_FILE_SHA256.md`, `../reviews/SECURITY_REACK_COMPOSE_FILE_SHA256.md`  
**Evidence:** `phase1.5-attestation/EVIDENCE_COMPOSE_FILE_SHA256_MIGRATION.md`

## Decision
**MERGE APPROVED / STAMPED.**

## Recomputed
| Check | Result |
|-------|--------|
| measurements.json sha256 | `784e4d2e09cde403c77ed60698ac7eec66b2fe4cead2c40db5281467afa6923f` (was `09ce9a2d…cbb8`) |
| Both GLM rows pin | `compose_file_sha256` = `904054f502ccdb2f913d6b80f156ea658b8bc5cb6f8af06082723581d62a45c0` |
| Unchanged | rtmr3 (`463b2e18…`, `e0f6c83e…`), mrconfigid, app_compose_sha256, effective_from, approver |
| Abliterated `ce0dbf70…` | 0 |
| phase1.5 tests | **112/112** |
| phase2 tests | **38/38** |
| Offline verifyReport (4 recorded GLM slugs) | **PASS** all; observed digest `904054f5…` |
| Negative (pin → 64×`0`) | **DENY** `compose_file_sha256_mismatch` all 4 |

## Gate
AE may merge. No invent pins; new compose YAML ⇒ new PS-approved hash. Abliterated remains unapprovable.
