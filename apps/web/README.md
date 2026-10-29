# Salomon — local research agent for journalists (Phase 3 M1 dogfood)

> **One-liner (Lead-approved):** Local research agent for journalists/investigators that protects sources.

Web app is the **primary** surface; the CLI (`near-privacy-ai/phase3-cli`, `salomon ask`) is a secondary thin client of the same `askLocal`.

**Status:** UX dogfood · Phase 3 **M1** (offline/local `ask`). Do **not** read demo mask / approvals UI as shipped M2/M3 guarantees — see PS skim `near-privacy-ai/docs/reviews/SECURITY_SOFT_SKIM_SALOMON_APP_M1.md`.

## Run
```
cp .env.example .env.local   # set SALOMON_GGUF for real local; or SALOMON_ALLOW_ASK_STUB=1 for UI dogfood only
npm install && npm run dev
```

## M1: offline ask (what is in scope)
- `POST /api/ask` → `lib/askLocal.ts` is the M1 fail-closed path (contract in `near-privacy-ai/phase3-runtime/DESIGN_M1_LOCAL_ASK.md` §6). ⚠️ The Research desk UI currently sends via `/api/chat`; with `AI_GATEWAY_API_KEY` set it goes to a remote gateway, badged `DEMO · REMOTE · … · not local`. Rewiring the desk to `/api/ask` is open (PS soft note 1).
- **Fail-closed:** no local model → `503 local_model_unavailable`, plain message, nothing sent anywhere. No HuggingFace pull, no gateway fallback on `/api/ask`.
- Secrets / key material in the question → `422 sanitizer_rejected` with a plain-language reason.
- Stub (`SALOMON_ALLOW_ASK_STUB=1`) is **demo only** — not a real on-device model. Badge it as stub, not LOCAL.

## Not M1 (do not claim as shipped)
- **M2:** Source-identity masking before the model (browser demo heuristic ≠ guarantee).
- **M3:** Propose-only save/export + approval UX as product gate.
- “Source-safe” as a guarantee — prefer the approved one-liner or “UX dogfood · Phase 3 M1”.

## Demo gateway
`AI_GATEWAY_API_KEY` enables a remote demo path on `/api/chat`, always badged **DEMO · REMOTE**. Do not set it when testing local-only behaviour. Never an automatic fallback for `/api/ask`.
