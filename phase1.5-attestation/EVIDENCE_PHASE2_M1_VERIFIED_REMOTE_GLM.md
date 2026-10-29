# Phase 2 M1 — verified-remote GREEN against `z-ai/glm-5.3-flash` (digest-only)

Script: `scripts/runVerifiedRemoteGlm.ts` (`npx vite-node scripts/runVerifiedRemoteGlm.ts`). `AttestationClient({requireProductionPlugs:true})` auto-wires DCAP quote, NRAS GPU, DCAP gateway, Noble binder. Key from gitignored `.env` only; never printed. Raw run JSON (digests only): `evidence/phase2_m1_live_run.json`, `evidence/phase2_m1_pre_effective_run.json`.
`allowlist/measurements.json` unchanged: sha256 `0e84e2548c844f0a05170ba4a547f868385b54d78a57d7fb8280003b2d376e35`, exactly one GLM entry (PS, effective_from 2026-10-29T17:00:00Z). No pins invented.

## Happy path — PASS (run 2026-10-29T17:02:07Z)
| step | result | digests |
|---|---|---|
| gateway attest | pass | nonceHash 596369c0…3c4d, gw quoteSha256 36a50a6e…a7eb |
| model attest + allowlist | pass | quoteSha256 68068a13…c062, rtmr3 463b2e18f0dde370…, mrconfigid 01a0e3c6f4f21a60ea…, compose a0e3c6f4…8c5f, TCB UpToDate, NVIDIA verified, CM quote c3fe11dc…2576 |
| completion (`max_tokens:8`, no tools) | pass | requestHash 1ce95977…c81f, responseHash 46dc756e…451d, chatId present |
| provider_tee bind | pass | ecdsa, signingAddressSha256 2631ece1…7fda (matches preflight) |
verified: **true**, exit 0.

## Negatives — DENY (fail-closed)
| case | time (UTC) | result |
|---|---|---|
| GLM before effective_from (pinned instance) | 16:24:49Z | DENY allowlist "no exact allowlist pin" |
| `openai/privacy-filter` (non-abliterated, not allowlisted; attestation only, no inference) | 17:02Z | DENY allowlist "no exact allowlist pin" (gateway passed first) |
| GLM vs empty temp allowlist (measurements.json untouched) | 17:02Z | DENY allowlist_load "allowlist empty (deny-all)" |
| GLM routed to unpinned instance | 17:01:32Z | DENY allowlist "no exact allowlist pin" |
CM-missing deny is covered by unit tests (no live way to strip CM evidence).

## Finding — second GLM instance behind gateway (needs PS decision; not a blocker for M1)
Same app_id 2c0a0c96…, but a second instance_id `7bb9af0a…` with rtmr3 e0f6c83eec48dfbf…, compose 5f7ebd85cf1f480a…, TCB UpToDate, RTMR3 replay OK. ~1 in 5 samples at 17:01Z hit it; correctly DENIED. Pinned instance 19aea169… still serves. Impact: intermittent fail-closed denials (retry needed) for preflight; a completion routed to a different instance than preflight would fail bind. No pin added — PS must decide whether to approve a second entry after review.

## Hygiene
`npm test` 101/101. Key-pattern grep over scripts/evidence = 0. Soft refusal suite out of scope. Next: Phase 2 agent loop (GLM-only).
