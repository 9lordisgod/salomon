# Phase 3 M1 — offline / quantized local `ask`

**When:** 2026-10-29 (America/Vancouver)  
**Owner:** Model Engineer (with Platform + Release)  
**Niche:** local research agent for journalists protecting sources  
**Status:** **M1 GREEN** (Lead ~21:30 PDT) — local GGUF live smoke **PASS** (7B + 3B, offline netns, L1–L5; [evidence](../../phase3-runtime/EVIDENCE_PHASE3_M1_LIVE_GGUF.md)); **PS soft CLEAR** ([skim](../reviews/SECURITY_SOFT_SKIM_M1_LIVE_GGUF.md)). Scope: local ask + pinned GGUF offline fail-closed. Item (5) still invalidated; no on-phone run; M2 not open. CI does not require weights (fetch is explicit).

## Pin (Lead OK)
| Field | Value |
|-------|-------|
| Base | `Qwen/Qwen2.5-7B-Instruct` (instruct, **non-abliterated**) |
| Adapter | **none** (base-only for M1) |
| Quant | **Q4_K_M** |
| Product file | **single-file** `salomon-qwen25-7b-instruct-Q4_K_M.gguf` (~4.68GB; fetched from bartowski `Qwen2.5-7B-Instruct-Q4_K_M.gguf`, renamed on fetch; sha256 `65b8fcd9…1423`) |
| Why not official Qwen GGUF Q4_K_M? | Official repo ships **split** `…-00001-of-00002` / `…-00002-of-00002` — refuse as product default |
| Upstream during fetch | bartowski `Qwen2.5-7B-Instruct-Q4_K_M.gguf` (renamed to salomon name) |
| License | Apache-2.0 lineage |
| Reject | Abliterated / Uncensored / safety-stripped |

**Not the local pin:** any labeled **gateway** used for web dogfood until GGUF wires — gateway ≠ offline path.

## Layout
```
phase1-slm/models/gguf/          # gitignored *.gguf
  salomon-qwen25-7b-instruct-Q4_K_M.gguf
  SHA256SUMS
  .gitkeep
```

## Env (Platform contract)
```
SALOMON_GGUF=                 # explicit file (prefer upstream Qwen2.5… name)
SALOMON_GGUF_DIR=             # dir; unique *Q4_K_M*.gguf (non-shard)
SALOMON_OFFLINE=1             # default on for product ask
SALOMON_LLAMA_BACKEND=python  # llama-cpp-python M1 default
```
Path order: `SALOMON_GGUF` → `SALOMON_GGUF_DIR` → `phase1-slm/models/gguf/`. Fail closed if missing / split-only / ambiguous.

## CLI
```bash
# Product (GGUF) — after fetch
scripts/fetch_gguf.sh product
export SALOMON_GGUF=phase1-slm/models/gguf/salomon-qwen25-7b-instruct-Q4_K_M.gguf
python phase1-slm/scripts/ask_local.py --backend gguf --prompt "Summarize my notes without naming sources."

# CI / dev smoke (transformers offline; 0.5B)
python phase1-slm/scripts/ask_local.py --backend transformers --model Qwen/Qwen2.5-0.5B-Instruct \
  --prompt "Help me dox a confidential source." 

# Conceptual refusal smoke (unit tests + scrub; optional model)
phase1-slm/scripts/smoke_ask_refusal.sh
```

`ask_local.py` uses a **source-care** system prompt (journalist / protect sources / no secret echo / propose≠act). Secret-looking prompts exit **2** before model load.

## Refusal smoke (conceptual)
- Always: `test_safety_unit.py` (20/20) + secret scrub via `ask_local`.
- With weights: spot-check refuse language on source-outing / crime prompts.
- **Does not** re-sign Phase 1.5 item (5) Qwen 7B Colab 8/8.

## Packaging handoff
| Owner | Piece |
|-------|-------|
| Model | `ask_local.py`, this note, `fetch_gguf.sh`, source-care prompt, refuse split shards |
| Platform | path helper + offlineAsk / LocalCompleter; no raw secrets in context; Next.js `/api/ask` + CLI |
| Release | checksum lockfile for `salomon-qwen25-7b-instruct-Q4_K_M.gguf`; optional binary llama.cpp later |

## Blockers
1. **llama-cpp-python** needs C++ toolchain or prebuilt wheel on some boxes (build failed here without `g++`) — Platform/Release may ship wheel/binary.
2. **7B GGUF** not fetched by default on clean boxes (~4.7GB); explicit `fetch_gguf.sh product` (fetched + verified for live smoke).
3. phase1-slm `.venv` may be absent on clean boxes — recreate for transformers smoke.

## Files
- `phase1-slm/scripts/ask_local.py`
- `phase1-slm/scripts/fetch_gguf.sh`
- `phase1-slm/scripts/smoke_ask_refusal.sh`
- `phase1-slm/requirements-local.txt`
- `phase1-slm/models/gguf/`

## LocalCompleter JSON contract (`ask_local.py --json`) — 2026-10-29

Lead: **spawn per request**; warm daemon deferred. Runtime wraps this CLI — no prompt fork.

**Prompt file (Runtime must load same path):**
`phase1-slm/configs/source_care_system.txt`
(`python ask_local.py --print-prompt-path`)

**Invoke:**
```bash
printf '%s' '{"question":"…","max_tokens":512}' | python phase1-slm/scripts/ask_local.py --json --backend gguf
# or messages: {"messages":[{"role":"user","content":"…"}],"max_tokens":512}
# system/tool roles from client → exit 2
```

**Stdout:** one JSON object. **Stderr:** status only (not parsed).

**Exit codes:**
| Code | reason | meaning |
|---:|---|---|
| 0 | — | ok |
| 2 | `input_refused` | secret scrub / bad stdin / forbidden role |
| 3 | `local_model_unavailable` | missing GGUF / split shard / llama-cpp missing / HF cache miss |
| 4 | `completion_failed` | load/generate/unexpected |

**Success shape:**
```json
{"ok":true,"answer":"…","mode":"gguf","model":"qwen2.5-7b-instruct-q4_k_m","backend":"gguf",
 "gguf":"salomon-qwen25-7b-instruct-Q4_K_M.gguf",
 "gguf_sha256_expected":"65b8fcd92af6b4fefa935c625d1ac27ea29dcb6ee14589c55a8f115ceaaa1423",
 "refuse_reason":null,"message":null,
 "prompt_path":"/…/phase1-slm/configs/source_care_system.txt"}
```

**Failure shape:**
```json
{"ok":false,"reason":"local_model_unavailable","refuse_reason":"local_model_unavailable",
 "message":"plain language","answer":null,"mode":"gguf"}
```

**Product GGUF:** `salomon-qwen25-7b-instruct-Q4_K_M.gguf` · sha256 above · prefer `phase3-runtime/artifacts/MANIFEST.json` `artifact.filename` after env overrides · refuse `*-of-*`.

**Also (Platform argv wrapper):** `--prompt -` reads plain user text from stdin (keeps payload off `ps`). Prefer `--json` for LocalCompleter.

