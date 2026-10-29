# Phase 3 MVP runbook — local research agent (Docs Lead)

**When:** 2026-10-29 ~15:40 PDT (America/Vancouver)  
**Status:** M1 **IN FLIGHT** — document the local `ask` path only. Do **not** claim M2/M3 as shipped.  
**Audience:** engineers dogfooding M1; Product/Lead scope lock.  
**Privacy:** soft-review before any public claim that goes beyond what this runbook states.

## One-line product (Lead-approved — verbatim)

> Local research agent for journalists/investigators that protects sources.

Canonical niche: [`PRODUCT_NICHE.md`](PRODUCT_NICHE.md) · hero on main `f9d75fd` ([README](../../README.md)).

## Success bar (MVP)

| Bar | Meaning |
|---|---|
| No cloud-by-default | Local/offline inference is the product default |
| No secret echo | Refuse / must-not-echo; CI-gated where eval exists |
| No silent exposure | Fail closed; plain-language refuse / model-missing reasons |
| Source-ID masked before model | **M2** — not M1 |
| Credentials outside model | Design rule now; store + approval UX **M3** |
| Plain refuse/mask reasons | Required whenever refuse or strip fires |

## Surfaces (scope lock — Product + Lead)

| Surface | Role in MVP |
|---|---|
| **Next.js web app + API** (`POST /api/ask`) | **Primary** — local `ask` |
| CLI (`salomon ask`) | **Secondary** thin client over the same `askLocal` |
| Crypto / on-chain | **Parked** — `docs/archive/crypto/` |
| Newsroom vaults / legal-founder hero | **Out** (vaults → Phase 4) |

Do **not** describe the MVP as CLI-only.

## Milestones

| ID | One line | State |
|---|---|---|
| **M0** | Scope lock: Lead approved the Phase 3 journalist MVP brief | **DONE** |
| **M1** | Local run path: offline/local `ask` end-to-end; fail closed if model missing | **IN FLIGHT** |
| **M2** | Local ingest + source-identity masking | Not started — do not claim |
| **M3** | Propose-only save/export + approval UX | Not started — do not claim |
| **M4** | Dogfood cut | Later |

## What M1 is allowed to claim (when green)

- Offline/local `ask` through the hardened loop (sanitize → local completer → answer).
- Fail closed if the local model/GGUF is missing (no auto-download, no cloud fallback on `ask`).
- Plain-language refuse / model-unavailable reasons in the UX.
- Primary path: Next.js `POST /api/ask` → `askLocal`. CLI optional.

## What M1 must **not** claim

- Document ingest, source-ID masking, or mask-map UX (**M2**).
- Propose-only save/export or approval UI (**M3**).
- Act-without-approval, cloud-as-default, or crypto product features.
- Dataset expansion (seed **PARKED** at 362).
- That Phase 2 on-chain read tools are the journalist research tools.

## Local run (engineering pointers)

> Runtime design may still be a sketch. Prefer measured green from Frontend / Agent Runtime / Release over this summary.

1. **Weights / GGUF (Release):** [`phase3-runtime/LOCAL_RUN.md`](../../phase3-runtime/LOCAL_RUN.md) — fetch + verify Qwen2.5-7B-Instruct Q4_K_M; offline fail-closed.
2. **`askLocal` design (Agent Runtime):** [`phase3-runtime/DESIGN_M1_LOCAL_ASK.md`](../../phase3-runtime/DESIGN_M1_LOCAL_ASK.md) — web-first `POST /api/ask`; CLI secondary.
3. **Web stack (Frontend):** [`PHASE3_WEB_STACK.md`](PHASE3_WEB_STACK.md) — Next.js App Router primary; CLI secondary.
4. **CLI secondary:** [`../../phase3-cli/README.md`](../../phase3-cli/README.md) · kickoff history [`PHASE3_CLI_KICKOFF.md`](PHASE3_CLI_KICKOFF.md).
5. **Smoke gate (Eval):** [`../../phase3-eval/README.md`](../../phase3-eval/README.md) — fail-closed offline ask hooks.

### Expected dogfood shape (when wired)

```bash
# 1) Fetch GGUF once (not on ask)
./phase3-runtime/scripts/fetch_gguf.sh
./phase3-runtime/scripts/verify_gguf_lock.sh

# 2) Web primary (Frontend — when apps/web is up)
#    open local Next.js → Ask → POST /api/ask → askLocal (offline)

# 3) CLI secondary (optional)
cd phase3-cli && npm test && npm run ask -- ask "What is source protection?"
```

If the model file is missing, `ask` must refuse with a plain reason — never download mid-request, never fall back to cloud.

## Out of scope / parked

- Crypto, NEAR Intents, tokens, staking, on-chain tools as product — archive only.
- Cloud AI as the default path.
- Act-without-approval.
- Newsroom vaults / durable export policy — Phase 4.
- Legal / founder narrative as hero copy.
- Dataset unpark / journalism seed refresh — until Lead unparks.

## Privacy soft-review checklist (before overclaim)

- [ ] Claims match **only** M1 landed evidence (or say "in flight / design").
- [ ] No "masks source IDs" / "propose-approve save" until M2/M3 green.
- [ ] No cloud-default or auto-download on ask.
- [ ] Credentials never described as held by the model.
- [ ] Privacy & Safety skim on route exposure + refuse UX before public demo language.

## Related

- Status of record: [`STATUS.md`](../../STATUS.md) · plan: [`ROADMAP.md`](../../ROADMAP.md)
- Niche: [`PRODUCT_NICHE.md`](PRODUCT_NICHE.md)
- M1 claims / Product acceptance: [`PHASE3_M1_PRODUCT_ACCEPTANCE.md`](PHASE3_M1_PRODUCT_ACCEPTANCE.md) — M1 is **not green** until desk → `/api/ask` + offline smoke pass.
- M2 criteria (accepted; M2 not opened): [`../acceptance/PHASE3_M2_SOURCE_MASK_ACCEPT.md`](../acceptance/PHASE3_M2_SOURCE_MASK_ACCEPT.md)
