# Salomon — web companion (Phase 3 M1 dogfood)

> **One-liner:** Private local AI / personal research agent — on-device by default; credentials stay out of the model.

Web is a **companion** surface (primary product direction: Android app, not shipped). CLI (`near-privacy-ai/phase3-cli`, `salomon ask`) is another thin client of the same `askLocal`.

**Status:** UX dogfood · Phase 3 **M1** (offline/local `ask`). Do **not** read demo mask / approvals UI as shipped M2/M3 guarantees — see PS skim `near-privacy-ai/docs/reviews/SECURITY_SOFT_SKIM_SALOMON_APP_M1.md`.

## Run
```
cp .env.example .env.local   # set SALOMON_GGUF for real local; or SALOMON_ALLOW_ASK_STUB=1 for UI dogfood only
npm install && npm run dev
```

## M1: offline ask (what is in scope)
- Chat desk → `POST /api/ask` → `lib/askLocal.ts` (Runtime `askLocal`; contract in `near-privacy-ai/phase3-runtime/DESIGN_M1_LOCAL_ASK.md` §6).
- **Fail-closed:** no local model → `503 local_model_unavailable`, plain message, nothing sent anywhere. No HuggingFace pull, no gateway fallback on `/api/ask`.
- Secrets / key material in the question → `422 sanitizer_rejected` with a plain-language reason.
- Stub (`SALOMON_ALLOW_ASK_STUB=1`) is **demo only** — not a real on-device model. Badge it as stub, not LOCAL.

## Not M1 (do not claim as shipped)
- **M2:** Stronger redaction / privacy masking before the model (browser demo heuristic ≠ guarantee).
- **M3:** Propose-only save/export + approval UX as product gate.
- Android app / on-device phone inference as shipped product.

## Demo gateway
`AI_GATEWAY_API_KEY` only powers the legacy `/api/chat` demo and is always badged **REMOTE** when the user opts in. Never a default, never an automatic fallback for `/api/ask`.
