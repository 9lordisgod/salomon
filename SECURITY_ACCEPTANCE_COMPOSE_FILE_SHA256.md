# Acceptance — allowlist `compose_file_sha256` (AE schema draft)
**Author:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Audience:** Agent Engineer (implement), Lead (gate), SLM (Abliterated / product)  
**Context:** Soft follow-up from item (6)/G1. Runtime model workload is proven by compose_manager `compose_up.file_sha256`, not RTMR3 alone.

## Goal
Optional-but-enforceable pin: when set on an allowlist entry, verification DENYs unless the **latest model-relevant `compose_up`**’s `file_sha256` exactly matches the pin (after CM quote verify already passed).

## Schema (PS acceptance)
Add to `AllowlistEntry` (and parse/load):

| field | type | required | notes |
|-------|------|----------|-------|
| `compose_file_sha256` | lowercase hex **64** chars (sha256), no `0x` | **optional** per entry | Same hex normalize as other pins (`H()`). Malformed ⇒ `allowlist_load` DENY for that file. |

Do **not** add `actions_hash` as a pin. Do **not** require CM image digest in this change (still optional later).

## When the field is required vs optional
| Case | Rule |
|------|------|
| **Existing two GLM entries (today)** | Field **optional until** AE lands schema + PS-approved migration PR that **sets** it. After that PR merges, both current GLM pins **must** carry the pin below (or DENY). |
| **Any new production pin** after schema lands | **`compose_file_sha256` REQUIRED** for NEAR Cloud / CM-backed models (this product path). Missing ⇒ reject at PS review / fail `allowlist_load` if you add a loader rule for “CM path entries”. Prefer: verify-time — if entry has no field, match as today; PS process requires the field on new approvals. |
| **`test_only` fixtures** | May omit unless the test is specifically for this pin. |

## Pin values for current GLM compose (both instances)
Runtime file (already in notes; same on 19aea169 and 7bb9af0a):

- **file:** `prod/GLM-5.3-Flash-SGL-TP2x4-W4AFP8-V12Q8.yaml`
- **`compose_file_sha256`:** `904054f502ccdb2f913d6b80f156ea658b8bc5cb6f8af06082723581d62a45c0`
- tag/commit (notes only, not schema): `v0.0.521` / `7ee4a4c741259d0c69a81e5cda22c3dfce21cbc2`

**Rejected (never pin):** Abliterated DeepSeek `ce0dbf70…` / any `*abliterat*` compose.

## What “latest compose_up” means (fail-closed)
After `verifyComposeManager` succeeds:

1. From CM `actions[]`, consider only `action === "compose_up"` with a non-empty `file_sha256`.
2. **Latest** = max `timestamp` among those (ISO parse; missing/invalid timestamp ⇒ that action ineligible).
3. If **zero** eligible compose_ups ⇒ DENY check `compose_manager`, reason `compose_file_sha256_missing_up` (when the matched allowlist entry has `compose_file_sha256` set **or** when you implement “required for all CM path” — for v1: only when entry pin is set).
4. Compare `file_sha256` **exact** lowercase hex to entry pin. Mismatch ⇒ DENY `compose_manager` / `compose_file_sha256_mismatch` (include neither full secrets nor raw compose in logs — digest/prefix only).
5. Optional soft record in verified result: `composeFileSha256` observed (for digests). Do not log file body.

**Services array is advisory only** (otel-only latest ups are OK if `file_sha256` matches).

## Fail-closed rules (must hold)
1. CM absent/null ⇒ still DENY `compose_manager_missing` (G4) — unchanged; never skip CM to avoid this pin.
2. CM present + quote/TCB/nonce/report_data fail ⇒ DENY — unchanged; do not evaluate file pin if CM verify failed.
3. Entry has `compose_file_sha256` + latest up hash ≠ pin ⇒ **DENY** (no soft warn).
4. Entry has pin + no eligible latest up ⇒ **DENY**.
5. Entry omits pin ⇒ behavior = today’s match (rtmr3 + mrconfigid/app_compose only) until migration sets pins on GLM rows.
6. Empty allowlist ⇒ still `allowlist_load` DENY.
7. Multiple matching entries (two instances): each entry’s own `compose_file_sha256` checked against the **same** observed latest up for that attestation candidate; both GLM rows should use `904054f5…`.
8. No invent pins; no silent overwrite of rtmr3; new compose file ⇒ new PS-approved hash (and usually new capture).
9. Unit tests required: match; mismatch DENY; missing up DENY when pinned; omit field still passes current fixtures; malformed hex ⇒ load DENY; 101+ suite green; phase2 still green.

## Migration PR (after schema)
1. Implement field + verify wiring + tests.
2. Append `compose_file_sha256: "904054f5…"` to **both** existing GLM entries in `measurements.json` (same approver; bump notes; **do not** change rtmr3/mrconfigid).
3. PS quick re-ack (this acceptance doc + green tests) before merge — or Lead treats PS pre-acceptance as enough if AE pastes evidence; PS will sign a one-liner if asked.
4. Offline re-verify both instance fixtures against updated allowlist ⇒ PASS.

## Out of scope (this acceptance)
- Pinning CM image digests.
- Recompute of NEAR `actions_hash`.
- Phase 2 tool changes.
- Live GLM refusal suite (SLM owns; PS watches results — does not block this schema).

## Gate
Schema + verify + tests + GLM migration to `904054f5…` = **PS-acceptable**. Abliterated hashes remain unapprovable. No waive of CM/allowlist fail-closed.
