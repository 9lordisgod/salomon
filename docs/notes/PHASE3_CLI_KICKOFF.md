# Phase 3 CLI kickoff — draft (Frontend Engineer)

**When:** 2026-10-29 ~15:23 PDT (America/Vancouver)  
**Owner:** Frontend Engineer  
**Status:** **P3-M1 IN PROGRESS (Lead assigned)** — scope: local `ask` only (`phase3-cli/`); mask map / approve UX deferred to M2–M3.
**Product:** Salomon — a local research agent for journalists and investigators that protects sources (`docs/notes/PRODUCT_NICHE.md`)

> **Scope amend (Product+Lead 2026-10-29 ~15:40 PDT):** MVP primary surface is **Next.js web + API** (local `ask`). This CLI kickoff is **secondary**. See `PHASE3_WEB_STACK.md` and `PHASE3_MVP_RUNBOOK.md`. M1 = offline/local `ask` only — not approval stub as hero.


## Goal
Ship a **local-first research CLI for journalists** that wraps the Phase 2 agent loop with:
1. Read-only tools first (reuse phase2 loop + sanitizer; product surface is privacy-first, not chain pitch).
2. **Propose-only** for any state-changing action (reuse M4 propose pattern: model never signs/executes).
3. **Credential store outside the model** — CLI/host holds secrets; model never sees raw keys/tokens/passwords.
4. **Human approval flow** for anything above policy thresholds (TTY prompt / `--approve` / deny-by-default).

## Product UX priorities (draft from Product — honor when kicked off)
Order:
1. **Trust loop visible** — every consequential step shows propose → policy → you approve (never silent action).
2. **CLI personal agent** — local install/run, ask, answers; read-only tools + hard caps; clear refuse reasons.
3. **Credential boundary** — store outside the model; model never sees raw secrets; approval UI for state-changing proposals.
4. **Quantized on-device path** (Release/Platform) — CLI assumes **local model**, not a cloud default.
5. **Plain-language refuse/sanitize** — say why it refused or stripped.

Narrative keepers: runs close to you · refuses to leak · never holds your keys · model proposes, you dispose.  
Out: crypto/NEAR pitch, TEE-as-product, execute/sign (G3).

## Non-goals (this kickoff)
- Execute/sign (M4 G3) — not opened.
- Full GUI / TUI polish beyond a usable CLI.
- Packaging/distribution (coordinate with Platform / Release later).
- Dataset unpark / model training (Model Engineer).

## Proposed layout
```
phase3-cli/
  package.json          # TypeScript; depends on phase2 + phase1.5-attestation patterns
  src/
    bin/salomon.ts      # entry: salomon chat | propose | approve | status
    approval.ts         # interactive + non-interactive approval gate (visible trust loop)
    credentials.ts      # OS-backed or file vault; model-inaccessible API
    session.ts          # transcript (no prompt logs by default); digest-only logs
    localModel.ts       # default path: local inference (llama.cpp/GGUF when ready)
    remoteVerified.ts   # optional only: wrap VerifiedCompletionClient; never the default
    tools/              # product tool set (privacy-first; chain tools not product UX)
  test/
  README.md
  DESIGN.md
```

## First milestone (P3-M1) — CLI shell + approval stub
Acceptance (when Lead assigns):
- [ ] `salomon chat` runs a one-shot or REPL against a **mock** completer (no live remote required for unit path).
- [ ] Sanitizer runs before any model call (reuse `phase2/src/sanitize.ts`); refuse/sanitize moments explain why in plain language.
- [ ] Read-only tool calls execute; results wrapped UNTRUSTED (same envelope as phase2).
- [ ] Any propose_* path prints propose → policy → approve/deny; **blocks** until decide (or `--yes` only when `SALOMON_ALLOW_AUTO_APPROVE=1` and policy allows). Never silent action.
- [ ] Credentials API: `get/set/delete` for named secrets; model/tool args never receive secret values — only opaque refs (`cred:name`).
- [ ] Default inference path is **local** (stub until GGUF); verified-remote is opt-in and fail-closed.
- [ ] Default: no prompt transcript written to disk; optional `--log-digests` writes SHA-256 only.
- [ ] Vitest + typecheck green; Privacy & Safety skim before merge.

## Second milestone (P3-M2) — Wire real loop
- Plug phase2 `runAgentLoop` (or a privacy-first fork of system prompt / tools).
- Local model path first; optional verified-remote behind attestation allowlist.
- Coordinate Release/Platform for GGUF/llama.cpp packaging.

## Open questions for Lead / Product (when assigned)
1. **Tool surface for P3-M1:** privacy-product tools (local files, etc.) first — confirm chain read-only stays engineering-only?
2. **Credential backend for v0:** encrypted file under `~/.salomon/` vs OS keychain only?
3. **Package name / binary:** `salomon` OK?
4. **Repo home:** new `phase3-cli/` under near-privacy-ai (preferred) vs separate package?

## Dependencies
- Phase 2 M1–M3 GREEN (done); M4 propose pattern as safe-tooling reference (on-chain settlement archived).
- Privacy & Safety review on credentials + approval before any real secret storage.
- Platform / Release for packaging and quantized runtime; Agent Runtime for loop integration.

## Coordination
- Reports to: Lead Architect (idle until assigned)  
- Reviews: Privacy & Safety (credentials, approval, sanitizer edges)  
- Align: Product (full Phase 3 brief when Lead asks), Agent Runtime, Platform, Release, Docs Lead
