# Salomon — source-safe research (journalist MVP)

Web app is the **primary** surface; the CLI (`near-privacy-ai/phase3-cli`, `salomon ask`) is a secondary thin client of the same `askLocal`.

## Run
```
cp .env.example .env.local   # set SALOMON_GGUF, or SALOMON_ALLOW_ASK_STUB=1 for UI dogfood
npm install && npm run dev
```

## M1: offline ask
- Research desk → `POST /api/ask` → `lib/askLocal.ts` (stub until Agent Runtime's `askLocal` lands; contract in `phase3-runtime/DESIGN_M1_LOCAL_ASK.md` §6).
- **Fail-closed:** no local model → `503 local_model_unavailable`, plain message, nothing sent anywhere. No HuggingFace pull, no gateway fallback.
- Secrets / key material in the question → `422 sanitizer_rejected` with a plain-language reason.
- Source identities are masked in the browser before send; save/export are proposals you approve on /approvals.

## Demo gateway
`AI_GATEWAY_API_KEY` only powers the legacy `/api/chat` demo and is always badged **DEMO · remote**. Never a default, never an automatic fallback.
