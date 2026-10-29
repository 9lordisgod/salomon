# Decision — Phase 2 M1 second GLM instance
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Evidence:** `phase1.5-attestation/EVIDENCE_PHASE2_M1_VERIFIED_REMOTE_GLM.md`  
**M1:** verified-remote GREEN on pinned instance — **accepted** (measurements.json unchanged; fail-closed negatives OK).

## Decision
**Do not approve a second allowlist entry yet.**  
**Leave DENY-until-retry** for instance `7bb9af0a…` / rtmr3 `e0f6c83e…` / compose `5f7ebd85…`.

Client correctly DENYs (~1/5) — that is desired fail-closed behavior, not a bug.

## Why not pin now
1. **Compose differs** from the approved pin (`5f7ebd85…` ≠ pinned `a0e3c6f4…` / mrconfigid `01a0e3c6…`). This is not “same measurements, second instance-id” — it is a **different app_compose** (and thus different RTMR3), so it needs the same human compose review as item (6), including non-abliterated check.
2. **Evidence insufficient for a prod pin:** only truncated prefixes in the M1 markdown. No full hex pins, no `DRAFT_…` entry, no recorded capture/verify meta, no CM `file_sha256` / services / abliterat scan in artifacts under `fixtures/recorded` or `evidence/`.
3. Prior multi-instance ruling stands: **separate PS entries, never silent overwrite** — but only after a complete capture package.

## Operational note (non-blocking)
Intermittent preflight DENY is acceptable with retry. Sticky risk: completion routed to a different instance than preflight should fail bind — keep that fail-closed; soft eng follow-up = retry/sticky toward pinned instance (not a waive).

## What AE must bring for a second-entry review
1. Full capture + offline verify meta (like item 6) for instance `7bb9af0a…`.
2. Draft allowlist object with full `rtmr3`, `mrconfigid` and/or `app_compose_sha256`, instance_id/app_id in notes.
3. Latest `compose_up` file path + `file_sha256` + tag/commit; prove **no** abliterat; CM required path green.
4. Prefer a second capture on that instance (G2-style) before merge.
5. Do **not** invent pins; leave `measurements.json` as the single approved entry until PS signs a second.

## Gate
M1 GREEN accepted. Second pin **BLOCKED** pending package above. No waive of allowlist/CM rules. Phase 2 continues on pinned instance only.

## Lead options A/B (same day)
**PS call: (A)** — after AE captures genuine fixtures for instance `7bb9af0a…`, draft + PS review/approve a **second** `measurements.json` entry (separate pins; never silent overwrite; no invented pins).

**Interim until that package lands:** keep current fail-closed DENY + client retry (option B as temporary ops posture only — not the long-term pin policy).

Compose for the second instance still differs (`5f7ebd85…` ≠ pinned `a0e3c6f4…`); capture must prove non-abliterated + CM-required green before any second approver/`effective_from`.

## Follow-up: SECOND INSTANCE APPROVED (2026-10-29)
Package reviewed; compose skew explained (INSTANCE_LABEL only). Sign-off: `SECURITY_SIGNOFF_PHASE2_SECOND_INSTANCE_GLM.md`. AE to append approved entry.
