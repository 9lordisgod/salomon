# Review — Item (6) after G1/G2
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Evidence:** `phase1.5-attestation/EVIDENCE_PRE_PHASE2_G1_G2.md`  
**Draft:** `phase1.5-attestation/allowlist/DRAFT_deepseek-ai_DeepSeek-V4.1-Flash-1017.md`  
**Recomputed:** `npm test` → **101/101**; tsc clean; capture1+capture2 offline green incl. CM; empty allowlist still DENY `allowlist_load`.  
**`measurements.json`:** still `{ "entries": [] }` — **not** populated.

## Decision

| Scope | Verdict |
|-------|---------|
| **G1** compose_manager verify | **SIGNED OFF** |
| **G2** second capture (same instance) | **SIGNED OFF** |
| **Item (6) production allowlist merge** | **STILL BLOCKED** |

No `privacy_security_approver` set. No Phase 2 / no waive.

## G1 / G2 checklist
- Present CM ⇒ DCAP quote + TCB UpToDate / no advisories / non-debug + `nonce_source=client` + quote `report_data === actions_hash‖nonce` (+ echoed field): **Pass** (both captures, live dcap-qvl).
- `actions_hash` record-only, not pinned: **Correct**.
- Capture2 ~6 min later: same RTMR3, IMR3 digests, `instance-id=fccd496a…`, MRCONFIGID, compose sha, signing address: **confirmed**.
- Draft updated with latest compose_up / CM digests / skew note: **OK**.

## PS rulings (requested)

| # | Ruling |
|---|--------|
| **1 Instance pin** | **Accept.** Document in `notes` as instance-scoped (`instance-id=fccd496a…`). New/rescheduled instance ⇒ new RTMR3 ⇒ DENY until new PS entry. No forced multi-instance capture required before first pin. |
| **2 0.5.11 vs 0.5.12** | **Accept as naming-only skew** given identical RTMR3/MRTD/MRCONFIGID between model quote and CM quote. Keep the note in the draft / entry `notes`. |
| **3 `compose_file_sha256` + Abliterated** | Follow-up schema field for approved `compose_file_sha256`: **yes, do it next**. **Abliterated compose / `proxy-dsv41-abliterated`: NOT accepted for production privacy allowlist** without written Lead (+ SLM) product acceptance. Current latest up `…-Abliterated.yaml` (`file_sha256=ce0dbf70…`) is a **remaining merge blocker (G3)**. Prefer capture/pin of a non-abliterated compose for this `model_id`, or Lead/SLM explicit OK. |
| **4 Pin CM image digest** | **Not required now.** Optional follow-up. Runtime CM image changes without RTMR3 — quote-bound action log is the control; digest pin can come with `compose_file_sha256` work. |
| **5 `actions_hash` recompute** | **Quote binding is enough** for G1. Soft: ask NEAR for canonical `actions_hash` recompute when convenient — not blocking. |
| **6 Missing CM ⇒ DENY** | **Yes — required before merge (G4).** Flip from verify-if-present to **absent ⇒ DENY** on the verified path (this Cloud path proves runtime workload via CM). Present+fail already DENY. |

## Remaining blockers before `measurements.json` PR

1. **G3 — Abliterated product accept** (Lead/SLM) **or** new capture whose latest model `compose_up` is a non-abliterated file (update draft `file_sha256`).  
2. **G4 — require CM present** (absent ⇒ DENY) + tests; re-request with evidence.

Then PS will set:
- `privacy_security_approver`: `"Privacy Security"`
- `effective_from`: review-day UTC (or AE’s `2026-11-01T00:00:00Z` if still in the future at merge)
- `notes`: must include instance-id, instance-pin warning, 0.5.11/0.5.12 skew, latest `compose_file_sha256` + tag/commit, “CM required”
- Merge: **one** non-`test_only` object appended to `measurements.json` via PR only — never invent pins.

## Gate
Phase 2 **BLOCKED**. Item (6) production pin **BLOCKED** on G3+G4. G1+G2 eng work cleared.

## Lead alignment (2026-10-29)
masterdev: **G3 HOLD** — do not approve privacy production pin for Abliterated compose. User decision card open (hold / allow-with-note / reject model). Do not set approver or populate `measurements.json` until user written call **and** AE G4 (absent CM ⇒ DENY) clear.

Interim Lead rulings (match PS): (1) instance pin fail-closed; multi-instance = separate PS entries, never silent overwrite; (2) 0.5.11 vs 0.5.12 OK if RTMR3/MRTD/MRCONFIGID identical; (3) quote-bind `actions_hash` until NEAR recompute spec; (4) CM required for this model once G4 lands.

## G3 written product call (2026-10-29)
**Lead + SLM: REJECT** Abliterated for privacy production allowlist.

- Do **not** approve `file_sha256=ce0dbf70…` / service `proxy-dsv41-abliterated` / compose `…-Abliterated.yaml`.
- First prod pin only after a **non-abliterated** capture + PS re-review (plus AE **G4** absent CM ⇒ DENY).
- SLM: conflicts with Phase 1 refusal bar — see `../notes/SLM_POSITION_ABLITERATED_DEEPSEEK.md`.
- `measurements.json` stays `{entries:[]}`. No approver. No Phase 2 / no waive.
