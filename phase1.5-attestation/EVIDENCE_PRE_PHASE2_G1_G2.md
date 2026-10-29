# Evidence — Pre–Phase-2 G1 (compose_manager) + G2 (second capture)
Date: 2026-10-29 (America/Vancouver). Responds to `../SECURITY_SIGNOFF_PRE_PHASE2_ITEM6_DRAFT_REVIEW.md`. No key in any file. `allowlist/measurements.json` = `{"entries":[]}`; no approver set. No Phase 2 / no waive.

## Code
- `src/composeManager.ts` — `verifyComposeManager`, `expectedComposeManagerReportData` (actions_hash‖nonce, 32B each), `summarizeComposeManager` (record-only).
- `src/verify.ts` — `verifyOne`: if `compose_manager_attestation != null` ⇒ must verify, else DENY `compose_manager` (new `CheckName`). Pass records `composeManagerQuoteSha256`.
- `scripts/captureFixtures.mjs` — optional slug suffix arg (`_capture2`). `scripts/verifyRecorded.ts` — live DCAP on CM quote + summary + instance-id.
- `test/composeManager.test.ts` — 15 tests: layout, pass, report_data mismatch, foreign nonce, nonce_source, echoed report_data, quote/debug fail, TCB, advisories, malformed, verifyReport present+ok/present+fail/absent, recorded-fixture binding (both captures).

## Tests
`npm test` **101/101** (was 86), `tsc --noEmit` clean.

## Captures (raw gitignored under `fixtures/recorded/raw/`; meta commit-safe)
| | Capture 1 | Capture 2 |
|---|---|---|
| meta | `deepseek_ai_DeepSeek_V4_1_Flash_1017.{capture,verify}.meta.json` | `deepseek_ai_DeepSeek_V4_1_Flash_1017_capture2.{capture,verify}.meta.json` |
| captured (UTC) | 2026-10-29T15:58:07Z | 2026-10-29T16:04:18Z |
| report sha256 | (see meta) | `4b31f113de19785659185f3945ce09d3cbe4d9a4461d7e45cc77d6014cbf10fa` |
| model quote | UpToDate, [] , non-debug | UpToDate, [], non-debug |
| RTMR3 | `b82e033606007266ad7f92273645be6c06ef5712dc5c110ec1e306d79afd14e1a9e41e092353383cbc189d57768f5b8d` | **same** |
| IMR3 digests (10) | — | **identical** |
| instance-id | `fccd496ae28c19105777793efa98fbbd726219cc` | **same** |
| MRCONFIGID / compose sha | `ae66f844…2689265b` | same |
| gateway / NRAS / provider_tee | ok / ok / ok | ok / ok / ok |
| CM quote sha256 | `e3c3074f5969c09b1e96aab2d6d41ae0792d5f5cb2c17ab277b008bb0193b679` | `18406e3a1b138ace6e51d973918f6424d8cc6e706eaedb22b17c5442fa18c4ba` |
| CM verify (live dcap-qvl) | ok, UpToDate, [], report_data==actions_hash‖nonce, nonce_source=client | same |
| CM RTMR3/MRTD/MRCONFIGID | identical to model quote (same CVM) | same |
| actions / actions_hash | 188 / `49d56146…` | 188 / same |
| verifyReport w/ empty allowlist | DENY allowlist_load | DENY allowlist_load |

**RTMR3: SAME ⇒ same instance ⇒ instance pin** (documented in draft).

## Open questions for PS
1. Instance pin acceptable, or require capture across a forced different instance / multi-instance policy before approve?
2. `dstack-nvidia-0.5.11` vs CM `vm_config.image` 0.5.12 — accept as label skew given identical measurements?
3. Approve `compose_file_sha256 = ce0dbf70…` as a follow-up pin field (schema change) — and is the **Abliterated** compose acceptable for product?
4. Should CM image digest `a320bb…` be pinned (it changes at runtime without RTMR3)?
5. `actions_hash` not recomputable from `actions[]` by naive schemes — require NEAR spec for recompute, or accept quote binding only?
6. Should CM be *required* (absent ⇒ DENY) for this model, since it is present on all captures?
