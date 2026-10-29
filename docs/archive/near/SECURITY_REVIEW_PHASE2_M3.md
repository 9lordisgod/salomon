# Security skim — Phase 2 M3 (multi-tool / view_state)
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Evidence:** `phase2/EVIDENCE_PHASE2_M3_MULTI_TOOL.md` (+ dual-instance/sanitizer tidy noted)  
**Recomputed:** phase2 tests **30/30**. `measurements.json` still **two** PS pins (untouched this milestone).

## Verdict
**M3 accepted — continue.** New tools stay read-only; `view_state` hard caps are adequate; multi-step bounds still fail-closed. Soft residuals only.

## New tools
| Tool | PS note |
|------|---------|
| `view_access_key_list` | Read-only; keys truncated to 50; public keys may be redacted by sanitizer `PUBKEY_RX`. OK. |
| `view_state` | Read-only; `include_proof: false`; prefix base64 validated (≤256). **Caps:** ≤25 entries, ≤6 KB returned, per key/value slice 512/1024; RPC body refuse >1 MB. Truncation flags present. **Pass.** |
| `block` / `gas_price` | Read-only metadata; block_id / height validated. OK. |

No write/sign/broadcast/deploy tools. Unknown names → `tool_not_permitted` wrapped. **Pass.**

## Multi-step / attest bounds
- Default `maxSteps` **8** (was 6), still clamped **1..12**; exceed ⇒ DENY. Max **4** tool calls/step. **Pass.**
- Allowlist-miss retry ≤3 (1..5); CM/other ⇒ immediate DENY. Unchanged. **Pass.**
- System prompt states read-only + UNTRUSTED envelopes + capped `view_state`. Soft hygiene, helpful.

## wrapUntrusted tidy (from M2 soft)
Truncation now emits valid JSON `{_truncated_preview,text}` inside `data_json`. **Accepted.**

## Soft residuals (non-blocking)
1. **Sanitizer vs tool payloads:** `defaultSanitizer` / `sanitizeForRemote` treats long base64 (≥60) and 64+ hex as **secrets → reject** (`SanitizerRejected`). Legitimate `view_state` / large RPC fields inside the UNTRUSTED envelope can trip this on the *next* complete. Fail-closed (good) but may DENY usable multi-step state reads. Prefer: scan secrets on user/assistant more strictly than on already-wrapped `role:tool` envelopes, **or** map `SanitizerRejected` → `AgentDenied("sanitizer_rejected")` explicitly in the loop (today it throws that error type — tests cover user PEM; ensure callers treat it as DENY).
2. **`compose_file_sha256` allowlist schema** — still open follow-up (Lead noted); not an M3 blocker. Record runtime file_sha256 in notes until schema lands.
3. Dual-instance live green + sanitizer Python parity — accepted as supporting evidence; no pin changes.

## Non-waivers
No waive of allowlist/CM. No Abliterated. No invent pins. phase1.5-attestation verify path untouched.
