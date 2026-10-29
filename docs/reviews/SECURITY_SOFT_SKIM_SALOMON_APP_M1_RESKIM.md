# Soft re-skim — salomon-app S1 (after copy fixes)

**Reviewer:** Privacy & Safety  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Path skimmed:** `/workspace/salomon-app` (Lead also cited `apps/web` @ `182155f` — **not present on this box**; treat salomon-app as the synced tree)  
**Prior:** `SECURITY_SOFT_SKIM_SALOMON_APP_M1.md` (S1 soft deny / S2 accept)

## Verdict
| Item | Result |
|------|--------|
| S1 residual 1 — “Source-safe” chrome | **CLEAR** (header “Local research · Phase 3 M1”; title/README aligned) |
| S1 residual 2 — Protections overclaim | **CLEAR** (demo heuristic M2 + M3 placeholder; credentials claims only as shipped) |
| S1 residual 3 — stub badged LOCAL | **CLEAR** (`DEMO · stub · not a local model`; `chatMode` keeps stub ≠ local) |
| S1 residual 4 — mask subtitle caveat | **CLEAR** (“demo heuristic, not a guarantee (M2)” adjacent) |
| **S1 overall** | **SOFT CLEAR** for dogfood / public-demo wording on this tree |
| S2 `/api/ask` fail-closed | Still ACCEPT (unchanged contract); see soft notes |

## Soft notes (non-blocking; fix when convenient)
1. **Research desk transport is `/api/chat`**, not `/api/ask`. When `AI_GATEWAY_API_KEY` is set and no real local model, `chatMode()` selects **gateway** and the desk sends to cloud. UI labels `REMOTE GATEWAY · … · not local` (not silent). Lead rule preferred the word **demo** on non-local paths — consider `DEMO · REMOTE · …` so the badge matches the soft gate literally. Prefer also: do not let gateway outrank stub when both are configured unless the user explicitly chose remote.
2. **`apps/web` @ `182155f`** not on box — if that tree differs from `/workspace/salomon-app`, re-ping with path or sync before treating remote main as PS-cleared.
3. Approved README one-liner “protects sources” remains OK as Lead hero; do not resurrect “source-safe” guarantee chrome.

## Sign-off
S1 soft-deny from prior skim is **lifted** for `/workspace/salomon-app` dogfood copy. Soft notes 1–2 are hygiene, not a new soft-deny.

## Addendum — Docs Lead stamp (~15:58 PDT Thu Oct 29, 2026, America/Vancouver)
- Frontend follow-up landed the soft-note 1 wording: badges now read `DEMO · REMOTE · {model} · not local`, `DEMO · stub · not a local model`, `DEMO · no model connected`; `LOCAL · on-device` only for a real (non-stub) local backend (`lib/useMode.ts` on `/workspace/salomon-app`).
- Main SHAs verified via GitHub API: **`9f89ed9`** (docs: Privacy soft-skim S2 accept / S1 soft deny), **`62c5a80`** (docs: S1 copy align — apps/web/README + COPY_FIXES + LOCAL_ASK_SMOKE), **`339cb05`** (apps/web: askLocal wrapper + DEMO·REMOTE mode polish).
- Scope of this clear: **S1 SOFT CLEAR for M1 dogfood / demo copy only.** It does not mark M2 (ingest + masking) or M3 (propose-only save/approvals) as shipped, and it is not a security sign-off on gateway routing (soft note 1, second half, still open).
- Soft note 2 (`apps/web` vs `/workspace/salomon-app`) still open until Lead confirms the trees match on main.
