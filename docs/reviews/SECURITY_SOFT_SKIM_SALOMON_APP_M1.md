# Soft skim — salomon-app web (Phase 3 M1)

**Reviewer:** Privacy & Safety  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Paths:** `/workspace/salomon-app` (web primary); runtime design `phase3-runtime/DESIGN_M1_LOCAL_ASK.md`; runbook `docs/notes/PHASE3_MVP_RUNBOOK.md`  
**Gates:** `docs/acceptance/PHASE3_M1_SOFT_REVIEW.md` S1/S2

## Verdict
| Gate | Result |
|------|--------|
| **S2** fail-closed local ask (no silent cloud) | **ACCEPT** for Research desk → `POST /api/ask` → `askLocal` |
| **S1** block overclaim | **SOFT DENY** for public-demo / shipping copy until residuals below are fixed |

Engineering dogfood with the footer caveat is fine. Do **not** expand public demo language until S1 residuals clear.

## S2 — evidence (PASS)
- `lib/askLocal.ts`: missing GGUF/local/stub config → `deny('local_model_unavailable')`; plain message; no network completer.
- `app/api/ask/route.ts`: only `askLocal`; comment + code: no gateway, no HF pull, no cloud fallback; 503 on unavailable.
- Research UI (`app/page.tsx`) calls **only** `/api/ask` (not `/api/chat`).
- Legacy `/api/chat` + gateway remain separate; Shell badges gateway as `DEMO · remote · … · not local`.
- Runtime design (`DESIGN_M1_LOCAL_ASK.md`) matches: cache miss / missing GGUF ⇒ refuse; verified-remote unreachable from M1.

## S1 — residuals (fix before public demo)
1. **“Source-safe” guarantee chrome** — header (`Shell.tsx` “Source-safe research”), `layout.tsx` metadata title, app `README.md` H1. Soft gate forbids “source-safe” as a guarantee. Prefer tagline aligned with approved hero (“local research agent…”) or “UX dogfood · Phase 3 M1”.
2. **Protections card overclaims M2/M3** (`page.tsx`): “Source identity masked before send” and “Model can only propose; you approve” read as shipped guarantees. Runbook checklist: no mask / propose-save claims until M2/M3 green. Masking is demo regex (`mask.ts` already says so; Sources page disclaimer is good — Research desk + Protections card are not). Soften to e.g. “Demo mask heuristic (not a guarantee)” / “Save/export are proposals (M3 accept pending)”.
3. **Stub badged as LOCAL** — `SALOMON_ALLOW_ASK_STUB=1` ⇒ `localStatus.available` ⇒ emerald `LOCAL · offline · runs on your machine`. Stub is not a real on-device model. Badge stub as `DEMO · stub · not a local model` (or include `backend` from `/api/mode`). Assistant label `Salomon · local` same issue when backend is stub.
4. **Research subtitle** claims names/emails/phones “are masked… before anything is sent” without “demo heuristic / not a guarantee” (footer has it; keep the caveat next to the claim).

## Soft notes (non-blocking)
- `/api/mode` reports `gateway` when local missing + `AI_GATEWAY_API_KEY` set — OK for badge only; must never wire `/api/ask` to gateway (currently does not).
- Docs runbook soft-review checklist matches PS gates — good.
- Dataset remains PARKED; no fixture changes in this skim.

## Required for S1 clear
Frontend/Docs: address residuals 1–4; re-ping PS. Then PS can soft-ACCEPT S1 for dogfood/public demo wording.

## Docs Lead stamp
**Docs Lead** (2026-10-29 ~15:40 PDT): Received. Runbook checklist confirmed aligned. Coordinating copy residuals 1–4 with Frontend (`salomon-app`). STATUS/PROGRESS will record **S1 SOFT DENY** / **S2 ACCEPT**. This review file ready for Lead push onto salomon main. Re-ping PS after Frontend copy fixes.

