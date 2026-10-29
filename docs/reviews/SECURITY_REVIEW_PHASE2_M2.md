# Security skim — Phase 2 M2 agent loop
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Evidence:** `phase2/EVIDENCE_PHASE2_M2_AGENT_LOOP.md`  
**Recomputed:** `phase2` tests **15/15**; phase1.5-attestation untouched per AE (measurements still 1 entry until second-instance append).

## Verdict
**M2 accepted for Phase 2 continue** — no block. Injection wrapping + retry bounds are fail-closed enough. Soft residuals only (below).

## Injection wrapping
- `wrapUntrusted`: single JSON object `untrusted_tool_output` with explicit UNTRUSTED notice; payload in `data_json` as a **JSON-encoded string** so tool/RPC content cannot introduce sibling keys or break the envelope. **Pass.**
- Truncation at 8 KB: outer envelope still valid. Soft: truncate path does `JSON.stringify(payload.slice(...))` on an already-stringified blob (inner JSON may be invalid until double-parse) — does **not** enable injection escape; tidy later if desired.
- Read-only tool allowlist only; unknown names / bad args / RPC errors return wrapped `{error:…}`, never throw, never invoke write/sign RPC. **Pass.**
- Max 4 tool calls per step; extras get wrapped `too_many_tool_calls`. **Pass.**

## Retry / attest bounds
- `maxAttestAttempts` default **3**, clamped **1..5**. Retries **only** when `check === "allowlist"`; CM missing / other attestation fails ⇒ **immediate DENY** (no retry). Exhaustion ⇒ `allowlist_miss_retries_exhausted`. **Pass** (matches PS interim DENY+retry).
- `maxSteps` default 6, clamped 1..12; exceed ⇒ DENY. **Pass.**
- Model hard-locked to `z-ai/glm-5.3-flash`. **Pass.**
- Sanitize **before** every remote complete; sanitizer contract length-checked. Key/EVM/64-hex redaction present. Soft: 64-hex is broad (may redact hashes in tool JSON) — privacy-positive, OK for M2.

## Live smoke
AE digests: no-tool + `view_account near` green on pinned path; second instance not hit in live runs (mock covers retry).

## Second-instance pin
PS already **APPROVED** append of `7bb9af0a` (`../signoffs/SECURITY_SIGNOFF_PHASE2_SECOND_INSTANCE_GLM.md`). Workspace `measurements.json` still shows **1** entry at review time — AE should append when ready; until then DENY+retry remains correct.

## Non-waivers
No waive of allowlist/CM fail-closed. No Abliterated pins. No SKIP_ATTEST.

## Second pin append confirmed
AE appended exact approved 7bb9af0a entry; measurements.json now **two** entries (19aea169 untouched). phase1.5 101/101 + phase2 15/15 per AE (spot-check: entries match APPROVED_*.entry.json).
