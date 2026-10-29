# Review — Phase 2 second GLM instance (7bb9af0a)
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Evidence:** `phase1.5-attestation/EVIDENCE_PHASE2_SECOND_INSTANCE_DRAFT.md`  
**Draft:** `allowlist/DRAFT_z-ai_glm-5.3-flash_instance_7bb9af0a.md` + `.proposed.json`  
**measurements.json before merge:** sha256 `0e84e254…` — still **one** entry (19aea169). Untouched by this review.

## Decision
**APPROVED** — append a **second** non-`test_only` entry (option A). Do not replace or edit the existing pin.

## Findings
- Capture1+capture2 (~13s apart): all security pins **identical** (G2-style). Offline verify green incl. CM; 0 abliterat; DENY vs current allowlist (correct).
- Runtime `compose_up` file/sha/tag/commit **same** as first pin (`904054f5…` / V12Q8 / v0.0.521).
- **Why app_compose differs:** boot `app_compose` JSON identical except `docker_compose_file` env `INSTANCE_LABEL=gpu03` (pinned) vs `gpu04` (this instance). Same images, services, pre_launch_script, allowed_envs. Explains distinct `app_compose_sha256`/`mrconfigid` with same `app_id`/runtime model compose. **Accepted.**
- Same `mrtd` and signing_address_sha256 as pinned; RTMR3/IMR3 differ as expected for a separate instance.

## Approver fields
- `privacy_security_approver`: `"Privacy Security"`
- `effective_from`: `2026-10-29T17:10:00Z`

## Exact entry to append
See `phase1.5-attestation/allowlist/APPROVED_z-ai_glm-5.3-flash_instance_7bb9af0a.entry.json`.

## Merge instructions (AE)
1. **Append** the approved object to `measurements.json` `entries` (result: **two** objects). Do not invent other pins; do not remove the first.
2. Re-run tests; offline verify of instance2 fixtures should match the new pin.
3. Soft: M2 re-attest≤3 on allowlist miss is fine; keep CM-miss immediate DENY.

## Gate
Second pin **APPROVED** pending AE append. No waive of fail-closed rules. Abliterated still rejected.
