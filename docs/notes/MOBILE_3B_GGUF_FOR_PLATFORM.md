# Mobile GGUF — Platform handoff (Android / Play)

**Role:** `artifacts.mobile_primary` · `role=mobile` — on-device Android / Play mobile-size artifact.
**Not** a replacement for the desktop 7B default.

| Field | Value |
|-------|-------|
| Filename | `salomon-qwen25-3b-instruct-Q4_K_M.gguf` |
| sha256 | `9c9f56a391a3abbd5b89d0245bf6106081bcc3173119d4229235dd9d23253f94` |
| bytes | 1929903264 |
| Paths | `phase3-runtime/artifacts/…` · `phase1-slm/models/gguf/…` |
| MANIFEST | `phase3-runtime/artifacts/MANIFEST.json` → `artifacts.mobile_primary` |
| LOCK | `phase1-slm/models/gguf/LOCK.json` → `bartowski_mobile_3b` |
| Fetch | `phase3-runtime/scripts/fetch_gguf_mobile.sh` |

## Env hint
- Desktop default: `SALOMON_GGUF` → 7B artifact
- Mobile: `SALOMON_GGUF_ROLE=mobile` → MANIFEST `artifacts.mobile_primary` / 3B filename

## Out of scope here
- Device/Android runtime smoke
- Refusal suite claims on 3B
