# DRAFT allowlist — deepseek-ai/DeepSeek-V4.1-Flash-1017 (NOT LOADABLE; PS approval required)

Status: **DRAFT — not PS-approved.** measurements.json stays {"entries":[]} (deny-all).

## Proposed AllowlistEntry (schema unchanged)
```json
{
  "model_id": "deepseek-ai/DeepSeek-V4.1-Flash-1017",
  "rtmr3": "b82e033606007266ad7f92273645be6c06ef5712dc5c110ec1e306d79afd14e1a9e41e092353383cbc189d57768f5b8d",
  "mrconfigid": "01ae66f844658a7aee331dcb9fb59bd40323d71d192d37719e022cc4af8389265b000000000000000000000000000000",
  "app_compose_sha256": "ae66f844658a7aee331dcb9fb59bd40323d71d192d37719e022cc4af8389265b",
  "effective_from": "<PS to set; proposed 2026-11-01T00:00:00Z>",
  "notes": "Captured 2026-10-29T15:58:07.959Z via GET /v1/attestation/report (provider=near, x-no-aliasing). Single capture; dstack-nvidia-0.5.11.",
  "privacy_security_approver": "<PS to set>"
}
```
- gpu_evidence_sha256 intentionally not pinned: nvidia_payload is nonce-bound per request; GPU verified per-request via NRAS (passed).
- IMR3 event_log_digests (10) in fixtures/recorded/deepseek_ai_DeepSeek_V4_1_Flash_1017.verify.meta.json if PS wants them pinned.

## Evidence package (§B) — digest-only
- Obtained: cloud-api.near.ai/v1/attestation/report, provider=near, ecdsa, client nonce (nonceHash 6ac7730a3de20893280c1cde1950febd08361e24942b2b0b9601f5b2aa8d99d4), 2026-10-29T15:58:07.959Z UTC; scripts/captureFixtures.mjs + scripts/verifyRecorded.ts (DcapQuoteVerifier/@phala/dcap-qvl, NrasGpuVerifier, NobleResponseBinder).
- Model quote sha256 294e291555619af914df748b82fe65994c45dd52ea14b00cfd25b1e4c35f114f; TCB UpToDate; advisories []; non-debug; MRTD df4d77c857de652bd0fafa343a2026b51071ee03773d076d283abf1a7d36ff91ffa279ee4a617ac664f7e2a2c8d5891b.
- RTMR3 replay == quote: true. MRCONFIGID from compose == quote: true. report_data addr‖nonce: true.
- Gateway quote sha256 e14e639a28b7b9eefbedb79ea6197861d04487a5f50654fc55a546e35323db5a: ok, TCB UpToDate.
- nvidia_payload sha256 6dcfbb5dcb194eab412016cf10306b62815e13e0dc2d41c41462398ccbf07304; NRAS ok=true.
- provider_tee: kind=provider_tee, exact-bytes text true, signer==model addr true, EIP-191 true.

## Compose review (short)
- app_name dstack-nvidia-0.5.11; info.compose_hash == sha256(app_compose).
- **Flag:** compose_manager_attestation present (188 actions, actions_hash 49d561463a55a9b153698dc9f73fb9bd33362d032066418d6e24cadaa1e6d404, own quote). Runtime compose actions — PS to rule whether RTMR3 pin suffices or actions_hash must be reviewed/pinned.
- Single capture only; recommend ≥2 captures across instances before approval.

## Request
PS: review, set approver + effective_from, merge via PR if acceptable. Until then deny-all.

## PS review 2026-10-29 (America/Vancouver)
**NOT APPROVED for production.** See `../../SECURITY_SIGNOFF_PRE_PHASE2_ITEM6_DRAFT_REVIEW.md`.
Blocking: (G1) verify `compose_manager_attestation` when present — RTMR3 does not cover runtime `compose_up`; (G2) second capture (RTMR3 is instance-scoped via IMR3 `instance-id`).
Pins provisionally match capture; `gpu_evidence_sha256` omission OK. Do not set approver / do not merge until G1+G2 clear.

## G1 + G2 update (AE, 2026-10-29) — still DRAFT, no approver, `measurements.json` untouched
Evidence: `../EVIDENCE_PRE_PHASE2_G1_G2.md`.

### G1 — compose_manager_attestation now verified (present+fail ⇒ DENY `compose_manager`)
`src/composeManager.ts` wired in `verify.ts` `verifyOne`: DCAP quote via the same `QuoteVerifier` (dcap-qvl, debug rejected), TCB `UpToDate` + no advisories, `nonce_source==="client"`, `nonce==client nonce`, quote `report_data === actions_hash(32) ‖ nonce(32)` (layout confirmed on both captures), echoed `report_data` field must agree. Both genuine captures: **pass**.

**Record-only (NOT pinned; `actions_hash` is append-only):**
| Field | Value |
|---|---|
| latest `compose_up` file | `prod/DeepSeek-V4.1-Flash-1017-vLLM-DEP8-Abliterated.yaml` |
| file_sha256 | `ce0dbf705aa950db96e6c5cb169b13d1feb1716b02968418a3b5b43606e26440` |
| tag / commit | `v0.0.528` / `4f7a11dcf5ebf8cbe7c4c28f900bcba688264774` |
| timestamp (UTC) | 2026-10-29T06:24:03Z |
| services | proxy-dsv41, proxy-dsv41-abliterated, nginx, model-proxy-registrar |
| actions (both captures) | 188: compose_up 120, compose_down 51, compose_manager_started 8, compose_stage 5, docker_restart 4 |
| actions_hash (both captures, record only) | `49d561463a55a9b153698dc9f73fb9bd33362d032066418d6e24cadaa1e6d404` |

Compose-manager image digests in actions (3 historical):
- `sha256:6e035c8fb99c1d31f41760d25af178683a658cca4afd73cd0d366fbb5bf884be` — boot default; first 2026-09-09, last 2026-10-28T18:48Z
- `sha256:bc44e44e619dc003b3b5bcf53420b759a0ea058d0b81cf0caffc063a9d733193` — 2026-09-25 only
- `sha256:a320bb4882341c8e19ef1944436f6591ed73303732009ed5db9f6db6c9da756a` — latest start 2026-10-29T06:04Z (current)

Notes:
- **Version skew:** model `info.app_name=dstack-nvidia-0.5.11` vs CM `vm_config.image=dstack-nvidia-0.5.12`. Unexplained by evidence; CM quote RTMR3/MRTD/MRCONFIGID are **identical** to the model quote (same CVM), so the skew appears to be a label in `vm_config`, not a different measured image. Needs NEAR/PS ruling.
- CM image is upgraded at runtime (`a320bb…`) without RTMR3 change — another reason RTMR3 alone is insufficient.
- **Abliterated** compose filename + `proxy-dsv41-abliterated` service: product/safety signal for Lead/SLM.
- `actions_hash` itself is not recomputable from `actions[]` with naive sha256(JSON) / hash-chain; we rely on the quote binding only. Follow-up: approved `compose_file_sha256` allowlist field (not implemented; schema unchanged).

### G2 — second capture
Capture 2 (2026-10-29T16:04:18Z, nonceHash `474ebd86…`): RTMR3 **identical** (`b82e0336…768f5b8d`), `instance-id` **identical** (`fccd496ae28c19105777793efa98fbbd726219cc`), app-id `2c0a0c96…`, MRTD/MRCONFIGID/compose sha identical, signing address identical (sha256 `826cdafe…`). ⇒ **Same instance.** Proposed pin is therefore an **instance pin**: any new/rescheduled instance gets a new RTMR3 and DENIES until a new PS-approved entry. Two captures ~6 min apart do not prove the model is single-instance; a second instance would surface as allowlist DENY (fail-closed), not silent trust.

### Request
PS: re-review G1/G2. Approver/effective_from/merge remain PS-only via PR.

## PS re-review after G1/G2 (2026-10-29 America/Vancouver)
See `../../SECURITY_SIGNOFF_PRE_PHASE2_ITEM6_G1_G2.md`.

- **G1 + G2: SIGNED OFF.** Instance pin acceptable; 0.5.11/0.5.12 naming skew accepted; quote binding enough for `actions_hash`.
- **Production merge: still NOT APPROVED.** Blockers: **(G3)** Abliterated compose needs Lead/SLM written accept **or** non-abliterated capture; **(G4)** absent CM ⇒ DENY (require present) before merge.
- Do not set `privacy_security_approver` / do not touch `measurements.json` until G3+G4 clear.

### G4 — CM required
Notes for any approved entry must state **"CM required"**: verifier now DENYs when `compose_manager_attestation` is absent (`compose_manager_missing`). Item 6 still NOT APPROVED (G3 open: compose is Abliterated; awaiting user choice of non-abliterated model_id). `measurements.json` remains `{entries:[]}`.

### G3 REJECT Abliterated (Lead + SLM, 2026-10-29)
Do **not** pin `ce0dbf70…` / `proxy-dsv41-abliterated`. Capture a non-abliterated compose for this `model_id`, then re-request with G4. See `../../SECURITY_SIGNOFF_PRE_PHASE2_ITEM6_G1_G2.md`.

### REJECTED (Lead G3, 2026-10-29): Abliterated compose rejected entirely — do not use this draft. Superseded by `DRAFT_z-ai_glm-5.3-flash.md`.
