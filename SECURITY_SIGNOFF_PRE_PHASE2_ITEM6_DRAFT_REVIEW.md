# Review — Item (6) draft allowlist + genuine fixture capture
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Draft:** `phase1.5-attestation/allowlist/DRAFT_deepseek-ai_DeepSeek-V4.1-Flash-1017.md`  
**Evidence:** `phase1.5-attestation/EVIDENCE_PRE_PHASE2_FIXTURE_CAPTURE.md`  
**Recomputed:** offline `verifyRecorded.ts` on capture — TDX/gateway/RTMR3/MRCONFIGID/report_data/NRAS/provider_tee all green; empty allowlist still DENY `allowlist_load`. `npm test` **86/86**. `measurements.json` untouched `{entries:[]}`.

## Decision
**NOT APPROVED for production merge.** Live allowlist stays deny-all.  
Fixture capture itself is **accepted as genuine evidence** (closes “need real NEAR samples” for RTMR3 / nvidia+NRAS / provider_tee ecdsa). Draft pins are **provisionally measured** but **blocked** on gaps below.

Do **not** set `privacy_security_approver` or populate `measurements.json` until gaps clear. No Phase 2 / no waive.

## What checked out
| Check | Result |
|-------|--------|
| Model TDX quote (dcap-qvl) | ok, UpToDate, advisories [], non-debug |
| Gateway quote + nonce/report_data | ok |
| RTMR3 replay == quote | match `b82e0336…768f5b8d` |
| MRCONFIGID / `app_compose_sha256` | match `ae66f844…2689265b` / padded mrconfigid |
| NRAS J1–J3 path on real nvidia_payload | ok |
| provider_tee ecdsa exact-byte bind | ok, unique to model signing address |
| Empty allowlist deny-all | DENY `allowlist_load` |
| No `gpu_evidence_sha256` | **Correct** — payload is nonce-bound per request |

Proposed pin values match recomputation. Digest-only meta is appropriate.

## Gaps (blocking production allowlist)

### G1 — `compose_manager_attestation` ignored (critical)
Report carries `compose_manager_attestation`: 188 actions, own TDX quote, `report_data = actions_hash ‖ client_nonce` (verified manually), `nonce_source=client`.

**IMR3 / RTMR3 does NOT cover this.** Boot events are `system-preparing … compose-hash … instance-id … os-image-hash … system-ready`. Runtime `compose_up` / `compose_down` (120/51) change workloads **after** boot without extending RTMR3.

Boot `app_compose` only pins infra images (otel, certbot, compose-manager). Latest runtime action:
`compose_up` → `prod/DeepSeek-V4.1-Flash-1017-vLLM-DEP8-Abliterated.yaml` (`file_sha256=ce0dbf70…6e26440`, tag `v0.0.528`). **Model inference path is runtime-managed.**

**Ruling:** RTMR3 pin alone is **not** enough. Before any non-`test_only` allowlist entry:
1. When `compose_manager_attestation` is present → **must** DCAP-verify its quote + require `report_data === actions_hash ‖ request_nonce` + nonce == client nonce + TCB UpToDate / non-debug; present+fail ⇒ DENY.
2. Draft must record human review of latest model `compose_up` (`file`, `file_sha256`, `commit`, `tag`) and unique compose-manager image digests seen in actions.
3. Follow-up (can land with or right after): optional allowlist field or notes pin for approved `compose_file_sha256` values — actions_hash itself is append-only and must **not** be the long-lived pin.

### G2 — Second capture required
Single capture / single instance. IMR3 includes **`instance-id`** (`fccd496a…`), so **RTMR3 is instance-scoped**. Capture #2 required before production approve:
- Same RTMR3 ⇒ same instance (OK to document as instance pin).
- Different RTMR3 ⇒ separate entries or explicit multi-instance policy — do not silently overwrite.

### G3 — Compose / image human review incomplete for trust
- `name=dstack-nvidia-0.5.11` vs CM `vm_config.image=dstack-nvidia-0.5.12` (skew — explain in draft).
- Three historical `nearaidev/compose-manager@sha256:…` digests in actions (including boot default `6e035c8f…`).
- Abliterated compose filename is a product/safety signal — note for Lead/SLM; attestation still must know which file_sha256 is approved.

## Non-blocking
- `ohttp_attestation` present, unchecked (out of current bar; track).
- Negative fixture `deepseek/deepseek-v3.2` gateway-only signature — keep.
- Optional `event_log_digests[]` pin of the 10 IMR3 digests — nice-to-have, not a substitute for G1.
- `test_only: true` CI entry using these pins is allowed **after G1 verifier exists**, still not production clearance.

## Merge instructions (when unblocked)
1. AE: implement G1 verifier + tests; take capture #2; refresh draft with CM review + instance note + version skew.
2. PS: re-review → set `privacy_security_approver: "Privacy Security"`, `effective_from` (UTC, ≥ review day), append **one** non-`test_only` object to `measurements.json` via PR only.
3. Until then: `measurements.json` = `{ "entries": [] }`.

## Gate
**Item (6) production allowlist: BLOCKED.** Fixture evidence: accepted. Phase 2: BLOCKED. No waive.
