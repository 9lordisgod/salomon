# Salomon — web app (`apps/web`)

A research desk for journalists and investigators that protects sources. This is the **product UX dogfood** surface.

> **Not local yet.** The on-device local model (quantized/GGUF) path is **Phase 3 M1** and is *not* wired here. This app runs either in **Demo mode** (stub model, no network) or **Remote Gateway mode** (Vercel AI Gateway). The header badge always shows which one.

## Screens
- `/` **Research**: streaming ask (AI SDK `useChat` → `/api/chat`). Notes are masked in the browser before sending.
- `/sources` **Sources**: paste notes, see what the model sees, and review the mask map (names, emails, phones, handles, code names → `[NAME-1]` etc.). The original text stays in browser localStorage.
- `/approvals` **Approvals**: propose-only save/export cards. Nothing writes until you click Approve. Approving downloads a local file and sends nothing anywhere.

## Run
```bash
npm install
cp .env.example .env.local   # leave AI_GATEWAY_API_KEY empty for demo mode
npm run dev                  # http://localhost:3000
npm run build && npm start   # production
```

## Env
| Var | Purpose |
|---|---|
| `AI_GATEWAY_API_KEY` | Server-only. If set, chat uses Vercel AI Gateway (remote, **not local**). If empty, you get demo mode. |
| `SALOMON_MODEL` | Optional gateway model id (default `anthropic/claude-sonnet-5.5`). |

## Privacy design
- The key is read only on the server. It is never sent to the client or placed in model context.
- Defense in depth: the server strips secret-looking strings (`[REDACTED-SECRET]`) and masks source identity again before calling the model. Input is capped at the last 20 messages and 8k chars per part.
- The system prompt (`lib/prompt.ts`) tells the model to refuse to echo secrets or source-identifying details, to explain each refusal in plain language, and to treat notes as untrusted data. The model can only *propose* actions.
- Masking is a regex demo heuristic, **not** an anonymity guarantee.

## API
- `POST /api/chat` (alias `POST /api/ask`): AI SDK UI message stream. Response header `x-salomon-mode: demo|gateway`.
- `GET /api/mode`: `{ mode, model, local: false }`. This flips to a local path once `askLocal` (Phase 3 M1) lands.

Built with Next.js App Router, TypeScript, Tailwind, AI SDK v7 (`ai`, `@ai-sdk/react`).
