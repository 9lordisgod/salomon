# Security skim — soft sanitizer (role:tool UNTRUSTED envelopes)
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Code:** `phase2/src/sanitize.ts`, `agentLoop.ts`, `test/soft.sanitizer.test.ts`  
**Recomputed:** phase2 **38/38**. measurements.json untouched (`09ce9a2d…cbb8`).

## Verdict
**Accepted.** Approach A is the right tradeoff for read-only chain data.

## What passes
- Relax **only** `base64_blob` / `hex_key_64+`, and **only** when `isWrappedUntrustedToolMessage` (role:tool + exact `untrusted_tool_output` key set + parseable `data_json`).
- PEM / ed25519 secret (80+) / `sk-` / api_key= / bip39-like still reject inside envelopes. Extra envelope keys / unwrapped tool content keep full rules. User/assistant/system unchanged.
- `SanitizerRejected` → `AgentDenied("sanitizer_rejected")` before attest/complete; reasons logged as rule names only. **Pass.**

## Residual (your call) — PS ruling
1. **Hex/base64 inside a valid envelope reaching the model:** **Accept** for this product path — that is public view_state / hash material; the UNTRUSTED notice + no write tools is the control. Do not re-harden blob rules on envelopes without a better false-positive story.
2. **Forged envelope from a custom `ToolExecutor`:** **Accept as eng trust boundary.** Production loop must keep `NearReadOnlyTools` (or equivalent that only emits wrapUntrusted). Soft: document “do not inject untrusted ToolExecutor”; optional later assert executor identity in the loop. Not a merge blocker.

## Non-waivers
No change to allowlist/CM. No pin invents. compose_file_sha256 work separate.
