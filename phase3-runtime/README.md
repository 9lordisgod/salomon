# Phase 3 M1 — GGUF / local runtime packaging

**Owner:** Release Engineer · **With:** Model Engineer, Platform Engineer  
**Status:** PIN LOCKED · single-file release name + MANIFEST + SHA256SUMS committed · weights via `fetch_gguf.sh`

## Exact M1 artifact
| | |
|--|--|
| **Filename** | `salomon-qwen25-7b-instruct-Q4_K_M.gguf` |
| **SHA-256** | `65b8fcd92af6b4fefa935c625d1ac27ea29dcb6ee14589c55a8f115ceaaa1423` |
| **Bytes** | `4683074240` (~4.68 GB) |
| **Upstream** | `bartowski/Qwen2.5-7B-Instruct-GGUF` / `Qwen2.5-7B-Instruct-Q4_K_M.gguf` |
| **SALOMON_GGUF** | path to that filename |

Official Qwen Q4_K_M split shards are **rejected** (fail closed). Abliterated rejected.

## Layout
```
phase3-runtime/artifacts/MANIFEST.json   # committed — Platform reads this
phase3-runtime/artifacts/SHA256SUMS      # committed expected hash
phase3-runtime/artifacts/*.gguf           # fetched locally (gitignored)
phase1-slm/models/gguf/                # mirror cache + LOCK.json
phase3-runtime/scripts/fetch_gguf.sh
phase3-runtime/scripts/checksum_artifacts.sh
```

## Ship criteria
- [x] Single-file name + checksum locked
- [x] MANIFEST.json for Platform discovery
- [ ] Operator `./phase3-runtime/scripts/fetch_gguf.sh` + verify green on a host
- [ ] Platform LocalCompleter / Model ask_local wired to SALOMON_GGUF
