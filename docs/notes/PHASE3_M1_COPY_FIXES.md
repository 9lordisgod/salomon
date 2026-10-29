# Phase 3 M1 — salomon-app copy fixes (Docs Lead × Frontend)

**Source:** `docs/reviews/SECURITY_SOFT_SKIM_SALOMON_APP_M1.md` (S1 SOFT DENY)  
**When:** 2026-10-29 ~15:40 PDT  
**Goal:** Clear S1 for dogfood/public-demo wording. No new heroes — use approved one-liner.

## Approved one-liner
> Local research agent for journalists/investigators that protects sources.

## Residual → suggested copy

| # | Where | Avoid | Prefer |
|---|---|---|---|
| 1 | Shell header / layout title / app README H1 | “Source-safe” as a guarantee | “Local research agent for journalists” or “UX dogfood · Phase 3 M1” |
| 2 | Protections card | “Source identity masked before send” / “Model can only propose; you approve” as shipped | “Demo mask heuristic (not a guarantee) · M2” / “Save/export will be propose-only (M3)” |
| 3 | Mode badge when `SALOMON_ALLOW_ASK_STUB=1` | Emerald `LOCAL · offline · runs on your machine` for stub | `DEMO · stub · not a local model` |
| 4 | Research subtitle | Unqualified “names/emails/phones are masked… before anything is sent” | Same claim **only** with adjacent “demo heuristic / not a guarantee” (footer alone is not enough) |

## Claims bar
See `docs/notes/PHASE3_MVP_RUNBOOK.md` Privacy soft-review checklist. S2 ask path is ACCEPT — do not change fail-closed `/api/ask` behavior for copy fixes.
