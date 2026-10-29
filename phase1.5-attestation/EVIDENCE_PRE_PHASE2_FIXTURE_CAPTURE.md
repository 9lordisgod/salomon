# Evidence — Pre–Phase-2 genuine fixture capture (NEAR AI Cloud)

Captured 2026-10-29 ~15:57–15:59 UTC. API key loaded only from gitignored `.env`; never printed or written (verified by grep). No Phase 2 / no waive. `allowlist/measurements.json` unchanged: `{"entries":[]}`.

## HTTP status (no auth material)
| Call | Model | Status |
|---|---|---|
| GET /v1/models | — | 200 |
| GET /v1/attestation/report | deepseek/deepseek-v3.2 | **503** "No provider found that supports attestation reports" |
| POST /v1/chat/completions + GET /v1/signature | deepseek/deepseek-v3.2 | 200 / 200 — `signature_kind: gateway` (correctly DENY for verified path; kept as negative fixture) |
| GET /v1/attestation/report (probe) | DeepSeek-V4.1-Flash-1017, Qwen3.6-35B-A3B-FP8, Qwen3.8-27B, glm-5.3-flash, Qwen3-VL-30B, privacy-filter | 200 (gateway + 1 model attestation + nvidia_payload) |
| GET /v1/attestation/report (probe) | deepseek-v4.1-flash, glm-5.3, kimi-k2.6, qwen3.5-397b | 503 |
| GET /v1/attestation/report | **deepseek-ai/DeepSeek-V4.1-Flash-1017** | 200 |
| POST /v1/chat/completions ("Say OK.", max_tokens 8) | same | 200 |
| GET /v1/signature/<chat_id>?signing_algo=ecdsa | same | 200 (`provider_tee`) |

## Files
Committable (digest-only): `fixtures/recorded/*.capture.meta.json`, `fixtures/recorded/deepseek_ai_DeepSeek_V4_1_Flash_1017.verify.meta.json`.
Gitignored raw (`fixtures/recorded/raw/`): `*.report.raw.json`, `*.nonce.txt`, `*.completion.req.json`, `*.completion.resp.json`, `*.signature.raw.json` (both models).
Scripts: `scripts/listModels.mjs`, `scripts/probeAttest.mjs`, `scripts/captureFixtures.mjs`, `scripts/verifyRecorded.ts` (`npx vite-node scripts/verifyRecorded.ts <slug>`).
Draft: `allowlist/DRAFT_deepseek-ai_DeepSeek-V4.1-Flash-1017.md`.

## Offline verify results (repo real plugs) — DeepSeek-V4.1-Flash-1017
- Model TDX quote (dcap-qvl + collateral): ok, UpToDate, no advisories, non-debug. quote sha256 `294e2915…f114f`.
- Gateway quote: ok, UpToDate, nonce + report_data bound. sha256 `e14e639a…3db5a`.
- RTMR3 replay from real event log == quote: **match** (`b82e0336…768f5b8d`). Closes "real NEAR report sample for RTMR3".
- MRCONFIGID from app_compose == quote: match. report_data addr‖nonce: match.
- NRAS (body JWT, JWKS x5c pins, iss): **ok** — real nvidia_payload sample.
- provider_tee ecdsa: text == `MODEL_ID:sha256(req):sha256(resp)` over exact bytes; signer == model signing_address; EIP-191 recover ok.
- `verifyReport` with empty allowlist: **DENY allowlist_load** (as required).

## Still missing / open
- PS approval of draft (item 6); measurements.json stays empty.
- Only one capture / one instance; recommend ≥2 captures before approval.
- `compose_manager_attestation` (runtime compose actions + own quote) not handled by verifier — PS ruling needed.
- Per-request nvidia_payload means no `gpu_evidence_sha256` pin proposed.
