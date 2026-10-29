# Local run — Salomon GGUF (Phase 3 M1)

**File:** `salomon-qwen25-7b-instruct-Q4_K_M.gguf`  
**SHA-256:** `65b8fcd92af6b4fefa935c625d1ac27ea29dcb6ee14589c55a8f115ceaaa1423`

## Fetch
```bash
./phase3-runtime/scripts/fetch_gguf.sh
export SALOMON_GGUF=$PWD/phase3-runtime/artifacts/salomon-qwen25-7b-instruct-Q4_K_M.gguf
```

## Platform discovery
1. `SALOMON_GGUF` (refuse `*-of-*` even if explicit)
2. `SALOMON_GGUF_DIR`
3. `phase3-runtime/artifacts/salomon-qwen25-7b-instruct-Q4_K_M.gguf` (MANIFEST)
4. `phase1-slm/models/gguf/salomon-qwen25-7b-instruct-Q4_K_M.gguf`

Backend: llama-cpp-python. CLI: `salomon`.

## Verify
```bash
./phase3-runtime/scripts/checksum_artifacts.sh verify
./phase3-runtime/scripts/verify_gguf_lock.sh
```
