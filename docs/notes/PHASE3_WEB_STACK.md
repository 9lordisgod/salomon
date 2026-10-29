# Phase 3 web — stack + first screen (Frontend Engineer)

**When:** 2026-10-29 ~15:34 PDT  
**Status:** Lead **no veto** — Next.js App Router + TS + Route Handlers approved. **Web primary**, CLI secondary. Scaffolding `apps/web`.

## Stack
| Layer | Choice |
|---|---|
| UI | Next.js App Router + React + TypeScript |
| API | `POST /api/ask` Route Handler → Agent Runtime `askLocal` (stub until Runtime lands) |
| Inference | Offline/local default; fail-closed if model missing |
| Refuse UX | Shared `explainRefuse` with `phase3-cli` |
| Demo | Any gateway path labeled **demo** in UI (none enabled in M1) |

## M1 screen
Ask + local-first badge + plain refuse/model-missing. Placeholders: mask map (M2), propose→approve (M3).

## Trees
- `apps/web` — primary (in progress)
- `phase3-cli` — secondary thin client (6/6 tests green)
- `phase3-runtime` — Release GGUF artifacts (not askLocal)
