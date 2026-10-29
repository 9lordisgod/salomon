# Evidence — Pre–Phase-2 hygiene PR (PS follow-ups 2, 3, 4, 5)
Date: 2026-10-29. Scope: hygiene only — no real dcap-qvl/NRAS/EIP-191 wiring, allowlist untouched (`{"entries":[]}` deny-all), no Phase 2.

Results: `npm test` **45/45** (attestation 26, responseBinding 14, realPlugs 5; was 35). `npx tsc --noEmit` clean.

| PS item | Change |
|---|---|
| 5 hygiene | Removed stale `report_data` TODO above LOCKED §D comment in `src/verify.ts`; §D behaviour unchanged. |
| 3 RTMR3 | `imr3EventDigest` = SHA-384(event_type LE32 ‖ ":" ‖ event UTF-8 ‖ ":" ‖ hex(event_payload)); `recomputeImr3Digests` requires non-empty provided digest == recomputed (else `rtmr3_replay` DENY); empty/absent digest uses recomputed (per NEAR docs); `replayRtmr` extends from 48 zero bytes with recomputed digests. Missing/non-uint32 event_type, missing event, non-hex payload ⇒ DENY. Allowlist `event_log_digests` now compared against recomputed digests. |
| 4 GPU hash | `gpu_evidence_sha256` = SHA-256 of exact `nvidia_payload` string UTF-8 bytes; JSON.stringify removed. Object payload + GPU pin present for model ⇒ `nvidia` DENY. |
| 2 prod guard | New `src/productionGuard.ts`; `AttestationClient` options `requireProductionPlugs`, `responseBinder`; `assertBoundCompletion` refuses stub/missing binder in production. Reason: `unwired_plug_forbidden_in_production: <slot>=<name>`. |

Files: `src/verify.ts`, `src/types.ts`, `src/productionGuard.ts` (new), `src/client.ts`, `src/responseBinding.ts`, `src/index.ts`, `test/attestation.test.ts`, `README.md`, `DESIGN_REAL_PLUGS.md`, this file.

New tests: RTMR3 happy recompute vs independent LE32 calc; matching (0x/uppercase) digest accepted + empty digest path; digest mismatch deny (unit + verifyReport); payload tamper / missing event_type / bad hex; exact-string GPU pin vs re-stringified pin; object payload with pin ⇒ deny; prod refusal of default stubs, Dcap/Nras stubs, Mock, stub binder, `requireProductionPlugs` outside prod; non-prod default constructs; `assertBoundCompletion` prod refusal.

Doc notes: NEAR reference code treats a missing `event_payload` as empty (we follow); it does not specify behaviour for missing `event_type`/`event` — we fail closed. Test fixture events are synthetic (event_type 0x08000001 chosen arbitrarily), not captured NEAR data — real-report replay still needs a live sample in a later PR.
