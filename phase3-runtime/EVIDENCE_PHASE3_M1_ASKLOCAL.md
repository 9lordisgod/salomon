# Evidence — Phase 3 M1 `askLocal` (Agent Runtime) · 2026-10-29 · NOT pushed

## Files
**New — `phase3-runtime/`**: `package.json` (test / typecheck / `smoke:m1`; reuses `../phase1.5-attestation` toolchain), `tsconfig.json`,
`src/askLocal.ts` (stable `askLocal(req, deps?)`, DESIGN §6 shapes, `answer` field, caps, schema validation, pre-gate),
`src/localCompleter.ts` (`createSpawnCompleter`: spawns `ask_local.py --json` per request, stdin-only, scrubbed env + `HF_HUB_OFFLINE/TRANSFORMERS_OFFLINE=1`, fail closed),
`src/localModel.ts` (re-export of phase2 pin), `src/reasons.ts` (fixed plain-language map + HTTP status), `src/index.ts`, `src/smokeM1.ts`,
`prompts/source_care.txt` (minimal journalist/source-care prompt, no crypto/NEAR — **Model Engineer owns the canonical; replace or point `SALOMON_SYSTEM_PROMPT` at it**),
`test/m1.asklocal.test.ts`, `test/helpers.ts`. DESIGN §9 "Answered" appended.
**New — `phase2/src/localModel.ts`**: `LOCAL_MODELS = [qwen2.5-7b-instruct-q4_k_m, Qwen/Qwen2.5-0.5B-Instruct]`, `assertAllowedLocalModel` (rejects abliterated/uncensored + anything unlisted). phase2 never imports phase3-runtime.
**Changed — `phase2/src/agentLoop.ts`** (backward compatible): options `systemPrompt?`, `toolSpecs?`, `modelPolicy?: "verified-remote"|"local"` (default remote), `attestation?`; new `LocalCompleterLike { kind:"local" }`.
Local ⇒ local pin, no `attest()`, requires `local:true`, max_tokens ≤1024, ≤2 tool calls/step, tool name must be registered and not propose/prepare/save/export/write/delete/send/upload/sign/execute ⇒ `forbidden_tool`. Mismatches (remote completer under local, local completer or missing attestation under remote, GLM id under local) ⇒ `policy_mismatch`. Remote path unchanged.

## Behaviour
- Sanitizer gate: each message goes through phase2 `redact()` (= `keyMaterialInContext` + `sanitizeForRemote`) before the loop; then the loop's `sanitizeMessages(defaultSanitizer)` runs before every `complete`. Secrets ⇒ 422 `input_refused`, model not called.
- Note: phase2 sanitizer redacts addresses (NEAR/EVM) + rejects secrets; **email/phone/name masking is M2** (not claimed).
- Tools: default `[]`; `echo_stub` test-only, output `wrapUntrusted`. Caps: 4 steps, 1024 tokens, 120 s wall timeout, 8000-char question, ≤10 history turns (user/assistant only), unknown keys ⇒ 400.
- Missing `ask_local.py` (searched: `SALOMON_ASK_LOCAL`, `phase3-runtime/scripts/`, `phase1-slm/scripts/`) or missing `SALOMON_GGUF` on gguf backend ⇒ 503 `local_model_unavailable`. No remote fallback exists in code.

## Results
- `cd phase2 && npm test` → **59/59**; `npm run typecheck` clean.
- `cd phase3-runtime && npm test` → **20/20** (DESIGN §7 items 1–7, plus spawn env/argv/exit-code checks of §9); `npm run typecheck` clean.
- `npm run smoke:m1 -- --report out.json && python3 ../phase3-eval/local_ask_smoke_gate.py --report out.json` → **9/9 PASS** (`make -C phase3-eval p3-m1-smoke REPORT=out.json` equivalent; `make` not installed on box). All fields measured: network monkeypatched (net/http/https/dns/fetch), file-tree diff for transcripts, completer body capture for sanitizer/secret checks, executor counter for silent actions.

## Frontend import (salomon-app)
```ts
// app/api/ask/route.ts  (export const runtime = "nodejs")
import { askLocal } from "../../../../near-privacy-ai/phase3-runtime/src/index";
const r = await askLocal(body);
return Response.json(r.ok ? r : { ok: false, reason: r.reason, message: r.message }, { status: r.ok ? 200 : r.status, headers: { "Cache-Control": "no-store" } });
```
Next/Turbopack needs the parent dir in scope: set `turbopack.root` (or `outputFileTracingRoot`) to `/workspace` in `next.config.ts`, or add a tsconfig path alias `"salomon/runtime": ["../near-privacy-ai/phase3-runtime/src/index.ts"]`. I did **not** edit salomon-app (avoid breaking Frontend's build); Frontend owns that wiring. Enforce 16 KB body cap in the route before `askLocal`.

## Blockers / open
- `ask_local.py --json` not landed (Model Engineer) → real path returns `local_model_unavailable`; 0.5B offline smoke + GGUF smoke pending. GGUF sha256 pin pending.
- §7.8 route contract tests and §7.9 Python-side tests belong with Frontend / ME once their pieces exist.
- PS review of sanitizer gate + prompt.
