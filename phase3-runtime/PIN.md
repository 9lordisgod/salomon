# Model pin for Phase 3 M1 packaging

**Status:** PINNED (Model Engineer + Lead OK + Release MANIFEST) — 2026-10-29  
**Source of truth also:** `docs/notes/PHASE3_M1_LOCAL_GGUF.md`

| Field | Value |
|-------|-------|
| Base model id | `Qwen/Qwen2.5-7B-Instruct` |
| Adapter / checkpoint | **base-only** (no adapter for M1) |
| Preferred quant(s) | `Q4_K_M` (single file) |
| Fetch source | `bartowski/Qwen2.5-7B-Instruct-GGUF` / `Qwen2.5-7B-Instruct-Q4_K_M.gguf` |
| **On-disk / release primary name** | `salomon-qwen25-7b-instruct-Q4_K_M.gguf` |
| sha256 (Release) | `65b8fcd9…1423` (full digest in Release SHA256SUMS) |
| License | Apache-2.0 lineage |
| Reject | Abliterated / Uncensored / safety-stripped; official Qwen **split** Q4_K_M shards |
| Layout | `phase1-slm/models/gguf/` or `phase3-runtime/artifacts/` |
| Env | `SALOMON_GGUF` → `…/salomon-qwen25-7b-instruct-Q4_K_M.gguf` |

Dev/CI smoke (not a release artifact): `Qwen/Qwen2.5-0.5B-Instruct` transformers offline, or `qwen2.5-0.5b-instruct-q4_k_m.gguf`.


## Mobile (Android / Play on-device) — separate from desktop 7B default

| Field | Value |
|-------|-------|
| Base model id | `Qwen/Qwen2.5-3B-Instruct` |
| Quant | `Q4_K_M` (single file) |
| Fetch source | `bartowski/Qwen2.5-3B-Instruct-GGUF` / `Qwen2.5-3B-Instruct-Q4_K_M.gguf` |
| On-disk name | `salomon-qwen25-3b-instruct-Q4_K_M.gguf` |
| sha256 | `9c9f56a391a3abbd5b89d0245bf6106081bcc3173119d4229235dd9d23253f94` |
| bytes | 1929903264 |
| Role | **mobile** (Android/Play mobile-size) — does **not** replace desktop 7B discovery default |
| Fetch script | `phase3-runtime/scripts/fetch_gguf_mobile.sh` |
