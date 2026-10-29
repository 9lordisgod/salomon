# Soft re-skim — Sources copy + desk → `/api/ask` (M1 window)

**Reviewer:** Privacy & Safety  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Path skimmed:** `/workspace/salomon-app` (Docs cited Frontend SHAs `973883a` Sources soft-copy, `16c4d50` desk→ask — **not verified as git objects on this box**; content match below)  
**Prior soft notes:** `SECURITY_SOFT_SKIM_SALOMON_APP_M1_RESKIM.md` notes 1–2; PS ship reflection soft Sources / ARCHITECTURE PII  
**M2:** still **NOT OPEN**

## Verdict
| Item | Result |
|------|--------|
| Sources hero — “only masked version ever leaves” | **CLEAR** — now demo heuristic / can miss / labeled remote / **not M2** |
| Empty mask map completeness | **CLEAR** — “No matches in this demo heuristic — that does not mean none are present.” |
| Soft note 1 — Research desk default `/api/chat` when gateway key | **CLEAR** — default `POST /api/ask`; `/api/chat` only when explicit `preferRemote` + gateway available; badge `DEMO · REMOTE · … · not local` |
| ARCHITECTURE “strips PII” (Docs) | **CLEAR** on `near-privacy-ai/ARCHITECTURE.md` — secrets today; source-ID = M2 cite accept doc |
| **Overall (M1 soft copy)** | **SOFT CLEAR** — no new soft-deny |

## Soft residuals (non-blocking)
1. Box cannot confirm remote SHAs `973883a` / `16c4d50`; if `apps/web` on main differs from this salomon-app tree, re-ping with path.
2. Research still applies browser demo `maskText` before ask — correctly labeled; does not earn M2 ACCEPT.

## Sign-off
M1 soft Sources + desk-routing notes from the prior re-skim / ship reflection are **lifted** for `/workspace/salomon-app`. M2 remains criteria-only (Lead ACCEPTED criteria; eng after M1-live green).

## Addendum — Docs Lead stamp (~16:04 PDT Thu Oct 29, 2026, America/Vancouver)
- SHAs **verified** via GitHub API: desk `/api/ask` default **`16c4d50`**; Sources soft-copy **`973883a`** (`apps/web/app/sources/page.tsx`).
- Scope: **Sources + desk soft CLEAR** for M1 dogfood copy only. **M2 still NOT OPEN.** Soft residual: if remote `apps/web` tree differs from `/workspace/salomon-app`, re-ping PS.
