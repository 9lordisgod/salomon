# Review — Item (6) G4 + GLM non-abliterated pin
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Evidence:** `phase1.5-attestation/EVIDENCE_PRE_PHASE2_G4_AND_MODEL_PROBE.md`  
**Draft:** `phase1.5-attestation/allowlist/DRAFT_z-ai_glm-5.3-flash.md`  
**Recomputed:** `npm test` → **101/101**; tsc clean.  
**Capture2:** present; all security pins **SAME** as capture1 (RTMR3, MRTD, MRCONFIGID, instance_id, app_id, signing_address_sha256, CM RTMR3/MRTD/MRCONFIGID, latest compose file/sha, IMR3 digests). Nonces differ. Empty allowlist still DENY `allowlist_load`. No `abliterat` in report.

## Decision

| Scope | Verdict |
|-------|---------|
| **G4** absent CM ⇒ DENY | **SIGNED OFF** |
| **G3** non-abliterated model pick (`z-ai/glm-5.3-flash`) | **SIGNED OFF** (DeepSeek Abliterated remains REJECTED) |
| **Item (6) production allowlist** for this entry | **APPROVED** — merge via PR only |

`measurements.json` must stay empty until AE merges the exact entry below. No Phase 2 / no waive from this sign-off (Lead opens Phase 2 separately).

## G4
- `verify.ts`: `compose_manager_attestation == null` ⇒ `AttestationError("compose_manager", "compose_manager_missing")`; present ⇒ G1 verify.
- Tests cover absent + null; fixtures carry mock CM. **Pass.**

## GLM pin checklist
- Dedicated non-abliterated compose `…-V12Q8.yaml` / `file_sha256=904054f5…`. **Pass.**
- Probe correctly rejected Abliterated DeepSeek + Qwen3.8-27B. **Pass.**
- Two captures ~90s apart, instance-scoped pin confirmed. **Pass.**
- TCB UpToDate, CM report_data = actions_hash‖nonce, NRAS + provider_tee green. **Pass.**
- Soft note (non-blocking): `latestComposeUp.services` may show only `otelcol-contrib` after a late otel up; model services appear in earlier same-file ups — record in notes.
- Soft follow-up: schema field `compose_file_sha256` still recommended; not required for this merge.

## Approver fields
- `privacy_security_approver`: `"Privacy Security"`
- `effective_from`: `2026-10-29T17:00:00Z`

## Exact entry to append (one object; not `test_only`)

```json
{
  "entries": [
    {
      "model_id": "z-ai/glm-5.3-flash",
      "mrconfigid": "01a0e3c6f4f21a60ea3f5c96bc7ef319b03a184ca2049605399275fbcea74e8c5f000000000000000000000000000000",
      "app_compose_sha256": "a0e3c6f4f21a60ea3f5c96bc7ef319b03a184ca2049605399275fbcea74e8c5f",
      "rtmr3": "463b2e18f0dde370e2be8d6b4cb07aac5efc4d8bc712cea2714d103e4db57cea4ce50197973d557306b25e70f82277d6",
      "effective_from": "2026-10-29T17:00:00Z",
      "privacy_security_approver": "Privacy Security",
      "notes": "Item (6) first prod pin. Instance-scoped RTMR3 (instance_id=19aea1693533dc2d529db03e3f725f20bde8d66d, app_id=2c0a0c96cb6dbd659bf1446e2f3fce58172ff91b); redeploy \u21d2 new PS entry, never silent overwrite. CM required (absent \u21d2 DENY compose_manager_missing). Non-abliterated compose prod/GLM-5.3-Flash-SGL-TP2x4-W4AFP8-V12Q8.yaml file_sha256=904054f502ccdb2f913d6b80f156ea658b8bc5cb6f8af06082723581d62a45c0 tag=v0.0.521 commit=7ee4a4c741259d0c69a81e5cda22c3dfce21cbc2; services across ups include model-sg-glm53-w4afp8-tp2-r1..r4 + otelcol-contrib (latest action services may list only otelcol). dstack-nvidia-0.5.11 app_name vs vm_config 0.5.12 naming skew with identical MRTD/RTMR3/MRCONFIGID \u2014 accepted. No gpu_evidence_sha256 (nonce-bound per request). Captures 2026-10-29T16:10Z + 16:12Z same pins. Evidence: phase1.5-attestation/EVIDENCE_PRE_PHASE2_G4_AND_MODEL_PROBE.md; SECURITY_SIGNOFF_PRE_PHASE2_ITEM6_GLM.md. Abliterated DeepSeek/Qwen rejected (G3)."
    }
  ]
}
```

Or append the single object inside existing `entries: []`.

## Merge instructions (AE)
1. PR only — replace `allowlist/measurements.json` with the JSON above (or append the one entry).
2. Do not invent other pins; do not include DeepSeek Abliterated.
3. After merge: offline verify with the pin should pass `allowlist` (not stop at `allowlist_load`).
4. Redeploy / new instance_id ⇒ DENY until new PS-approved entry.
5. Phase 2 remains Lead-gated.

## Gate
Item (6) **APPROVED** for `z-ai/glm-5.3-flash` pending AE PR. Phase 2 **still blocked** until Lead opens it.

## SLM / Lead product fit (same day)
`SLM_NOTE_GLM53_FLASH_ALLOWLIST.md` + Lead: no objection to `z-ai/glm-5.3-flash` as first privacy TEE allowlist candidate (non-abliterated). Not an attestation waive. Live GLM refusal suite = soft follow-up before refusal *claims*; does not block this pin.
