# Phase 3 M1 — Local `ask` (web-first: `POST /api/ask` → `askLocal`)
Owner: Agent Runtime · Status: DESIGN SKETCH (not implemented, not pushed) · 2026-10-29

## SUMMARY (paste to Lead / Frontend / Model Engineer)
- M1 = local Q&A. `POST /api/ask` (primary, Next.js) and `salomon ask "…"` (optional CLI) both wrap ONE stable export: `askLocal()` in `phase3-runtime/`. No loop forks.
- Pipeline unchanged from phase2: sanitize → LocalCompleter (offline) → optional read-only stub tools (UNTRUSTED-wrapped) → answer. Hard caps; AgentDenied fail-closed.
- Offline contract (Model Engineer): product default = GGUF Qwen2.5-7B-Instruct Q4_K_M (base, non-abliterated) via `ask_local.py --backend gguf` / `SALOMON_GGUF`; CPU smoke/CI = `ask_local.py --backend transformers --offline` (Qwen2.5-0.5B-Instruct).
- Fail closed: cache miss / missing GGUF ⇒ refuse (`local_model_unavailable`); no download, no cloud fallback. Verified-remote (GLM+attest) unreachable from M1.
- New `LocalCompleter` (sibling of `CompleterLike`): shells to `ask_local.py`, no attestation, no GLM allowlist; own local-model pin.
- Prompts NOT forked: the source-care system prompt lives with `ask_local.py`; runtime reads that same file, never a TS copy. No crypto/NEAR text.
- `runAgentLoop` parameterized (`systemPrompt`, `toolSpecs`, `modelPolicy: "verified-remote"|"local"`); attest skipped only for local. Phase2 defaults/tests unchanged.
- Tools: zero by default (optional `echo_stub` for tests). No ingest/mask (M2), no save/export (M3), no propose/execute. Dataset PARKED.
- Ownership: Agent Runtime = askLocal + LocalCompleter + loop params; Frontend = Next.js UI + route calling askLocal; Model Engineer = ask_local.py + prompt + model pins.
- Responses: answer + plain-language refusal reason + digests; no transcript to disk.
- Acceptance: vitest with mock completer (offline-miss, sanitizer-before-complete, no-attest-on-local, caps, API schema) + one 0.5B offline smoke; phase2 59/59 still green.

## 1. Goal / non-goals
**Goal:** a user asks a question in the web UI (or CLI) and gets an answer from a local offline model through the hardened loop.
**Non-goals:** M2 notes/docs ingest + source masking · M3 save/export · propose/approval UI · verified-remote · crypto (parked) · dataset work (parked).

## 2. Ownership
| Area | Owner |
|---|---|
| `askLocal`, `LocalCompleter`, loop parameterization, caps, reason map, tests | Agent Runtime |
| Next.js UI, `app/api/ask/route.ts` (calls `askLocal` only), CLI shell | Frontend |
| `ask_local.py` (gguf/transformers backends), source-care system prompt, model pins, offline cache | Model Engineer |
| Review: sanitizer, route exposure, prompt | Privacy & Safety |

**Location: `phase3-runtime/`** (dir exists). Keeps phase2 frozen as PS-accepted evidence (59/59), avoids colliding with Frontend's web/CLI package, gives Frontend one import (`askLocal`). Imports phase2 `sanitize.ts`, `wrapUntrusted`, `AgentDenied`, `assertNoForbiddenTools` — no copies.

## 3. Architecture
```
Next.js POST /api/ask ─┐
salomon ask "…" (CLI) ─┴─► askLocal(req) ─► runAgentLoop({ modelPolicy:"local" })
                                              ├─ sanitizeMessages (every step, before complete)
                                              ├─ LocalCompleter → ask_local.py (offline; no attest)
                                              ├─ tools: [] | echo_stub (read-only, wrapUntrusted)
                                              └─ caps: maxSteps≤4, ≤2 tool calls/step, maxTokens≤1024, wall timeout
                                          ◄─ AskResult | AgentDenied → plain-language reason
```
propose≠act unchanged: `assertNoForbiddenTools` still runs; no propose/save/export tools registered; nothing state-changing exists in M1. Model never receives credentials (none exist in M1; future = opaque `cred:name` refs).

## 4. LocalCompleter (offline contract)
```ts
export interface LocalCompleterLike {
  readonly kind: "local";
  complete(model: string, body: { messages: ChatMessage[]; tools: unknown[]; max_tokens: number })
    : Promise<{ local: true; response: { choices: [{ message: { content: string|null; tool_calls?: unknown[] } }] };
                requestHash: string; responseHash: string }>;
}
```
| Use | Backend | Invocation | Model |
|---|---|---|---|
| Product default | `gguf` | `ask_local.py --backend gguf` (path from `SALOMON_GGUF`) | Qwen2.5-7B-Instruct Q4_K_M, base-only, non-abliterated |
| CPU smoke / CI | `transformers` | `ask_local.py --backend transformers --offline` (fallback `local_inference.py --offline`) | Qwen/Qwen2.5-0.5B-Instruct |
| Unit tests | mock | in-process | — |

- Spawn with `HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1`, minimal env (no inherited secrets); messages via **stdin JSON**, never argv; read one JSON object from stdout (requested `--json` mode, see Q3).
- Fail closed: transformers cache miss or missing/unreadable GGUF ⇒ nonzero exit ⇒ `AgentDenied("local_model_unavailable")`; no cloud fallback path exists in code. Timeout / non-JSON ⇒ `completion_failed`. Exit 2 (local secret scrub) ⇒ `input_refused`.
- Local pin `assertAllowedLocalModel(id)`: `{qwen2.5-7b-instruct-q4_k_m (+ GGUF sha256), Qwen/Qwen2.5-0.5B-Instruct}`; abliterated ids rejected. Separate from GLM `assertAllowedModel` (remote only).
- Tool calling: Qwen one-shot tool-calls are weak; M1 default zero tools so not blocking.

## 5. agentLoop changes (backward compatible)
- Options: `systemPrompt?`, `toolSpecs?`, `modelPolicy?: "verified-remote" | "local"` (default `verified-remote`), `attestation?` (required iff verified-remote).
- `local` ⇒ `assertAllowedLocalModel`, require `completion.kind==="local"`, skip `attest()`, accept `local:true` (not `verified:true`). Any policy/completer mismatch ⇒ `AgentDenied("policy_mismatch")`.
- System prompt: single source of truth = Model Engineer's file shipped with `ask_local.py` (journalist / source-care). Runtime loads it at startup and fails closed if missing; it never defines its own copy. Clients can never send `system` messages.
- Defaults reproduce today's behaviour exactly → phase2 tests untouched.

## 6. HTTP + CLI touchpoints
`askLocal(req: AskRequest, deps?: { completer?, log? }): Promise<AskResult>` — stable; both surfaces wrap it.

**Request** `POST /api/ask` (JSON, body ≤ 16 KB; unknown keys ⇒ 400):
```json
{ "question": "string, 1–8000 chars", "history": [{ "role": "user|assistant", "content": "…" }], "options": { "maxTokens": 512 } }
```
`history` ≤ 10 turns; `system`/`tool` roles rejected.

**200**
```json
{ "ok": true, "answer": "…", "steps": 1, "backend": "gguf", "model": "qwen2.5-7b-instruct-q4_k_m",
  "redactions": [{ "kind": "email", "placeholder": "[REDACTED_EMAIL]" }], "transcriptSha256": "hex" }
```
**Denied** — 400 bad input · 422 refused/sanitizer · 503 `local_model_unavailable`
```json
{ "ok": false, "reason": "local_model_unavailable", "message": "The local model isn't installed on this device, so nothing was sent anywhere." }
```
Route rules (Frontend): Node runtime (not Edge), localhost bind by default, no body logging, `Cache-Control: no-store`, `message` only from runtime's fixed reason map.
**CLI:** `salomon ask "…" [--json]` → `askLocal`; exit 0 ok / 3 denied / 4 model unavailable.

## 7. Tests / acceptance
1. Happy path (mock): answer returned; system prompt equals ask_local prompt file; no `NEAR|crypto|wallet`.
2. Local policy never calls attestation (spy throws).
3. Cache miss / missing GGUF (completer exit≠0) ⇒ `local_model_unavailable`, no content, no retry to any remote.
4. Sanitizer runs before `complete` (spy sees redacted text only); reject ⇒ 422 shape.
5. Unpinned/abliterated local id ⇒ denied; GLM id under local policy ⇒ `policy_mismatch`.
6. Caps: steps, tool calls, token clamp, timeout; tool output UNTRUSTED-wrapped.
7. Forbidden/propose/save/export tool names ⇒ denied; default tool set empty.
8. `/api/ask` contract: schema 400s, client `system` rejected, denial JSON, `no-store`.
9. Python completer: stdin-only messages, scrubbed env, offline env vars set.
10. phase2 59/59 + typecheck green; one manual offline smoke with `--backend transformers` 0.5B (evidence doc); GGUF smoke when file present.

## 8. Open questions
1. **Frontend:** `/api/ask` as a Next.js route importing `askLocal` directly, or a small local TS server the UI proxies to? (Per-request Python spawn of a 7B GGUF argues for a warm process.)
2. **Frontend:** M1 non-streaming JSON OK, SSE later?
3. **Model Engineer:** will `ask_local.py` expose stdin-JSON-in / one-JSON-out (`--json`) with distinct exit codes (model missing vs scrubbed vs error), and where does the prompt file live?
4. **Model Engineer:** warm daemon (loopback-only) vs spawn per ask, and the GGUF sha256 to pin?

## 9. Answered (2026-10-29, Lead/Frontend)
1. `/api/ask` = Next.js Route Handler importing `askLocal` directly (Node runtime, non-streaming). Warm sidecar later.
2. Non-streaming JSON for M1; SSE later.
3. `ask_local.py --json` required (stdin JSON → one JSON `{answer|refuse_reason, mode}`); exit 2 = scrub refuse, other nonzero = model unavailable. Prompt: `phase3-runtime/prompts/source_care.txt` (or `SALOMON_SYSTEM_PROMPT`) until ME lands canonical.
4. M1 = spawn per request; daemon = later soft polish. GGUF sha256 pin still open (ME).
Implemented: see `EVIDENCE_PHASE3_M1_ASKLOCAL.md`.
