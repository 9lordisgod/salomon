# Phase 3 M1 — Product acceptance (Product owns)

**When:** 2026-10-29 ~15:57 PDT (America/Vancouver)  
**Audience:** Lead · Frontend · Runtime · Release · Docs · PS  
**Status:** Proposed acceptance bar for “M1 green” from a product lens. Engineering evidence still required from owners.

## One-liner (do not rewrite)
> Local research agent for journalists/investigators that protects sources.

## Behavior Product requires for M1 green
1. **Primary Research path = fail-closed local ask.** Desk sends only to `POST /api/ask` → `askLocal`. Legacy `/api/chat` / gateway is not the Research default (demo-labeled remote OK only if user explicitly chooses REMOTE).
2. **Model missing ⇒ refuse.** Plain-language reason; no mid-request download; no cloud fallback on ask.
3. **Mode honesty.** Real GGUF/local → LOCAL; stub → DEMO·stub; remote → DEMO·REMOTE. Stub never badges LOCAL.
4. **Copy matches runbook.** No “source-safe” guarantee chrome; masking = demo heuristic (M2); approvals = M3 placeholder.

## Acceptance checklist
- [ ] Research desk → `/api/ask` only (PS soft note #1 closed)
- [ ] Real offline ask smoke green with pinned Qwen2.5-7B-Instruct Q4_K_M (Release + Runtime)
- [ ] Stub path clearly DEMO; S1 remains soft-clear
- [ ] Docs: `PRODUCT_NICHE.md` present under `docs/notes/` (currently missing from near-privacy-ai tree; only `/workspace/out/`)
- [ ] ARCHITECTURE Phase 3 line says Next.js web + API primary, CLI secondary (not CLI-only)

## What not to claim when M1 greens
- Source-ID masking / ingest (**M2**)
- Propose-only save/export as a product gate (**M3**)
- “Sources never leave the device” as a measured guarantee beyond local ask + refuse + no silent cloud on `/api/ask`
- Phase 2 on-chain tools as journalist research tools
- Dataset expansion / journalism refusal fixtures (PARKED)

## Out of Product ownership
Wiring askLocal, GGUF pin, eval smoke, UI PRs — Runtime / Release / Frontend / Eval. Product owns claims bar + this acceptance cut.
