# Privacy & Safety — Soft skim: Phase 3 M1 live GGUF + 3B mobile allowlist

**Date:** Thu Oct 29, 2026 ~21:30 PDT · **Reviewer:** Privacy & Safety · **On main** (pushed by Lead ~21:30 PDT; box mtimes below, PDT)

## Verdict: **SOFT CLEAR** (no blockers)

## Paths reviewed (box mtime, PDT)
- `phase3-runtime/EVIDENCE_PHASE3_M1_LIVE_GGUF.md` (18:12)
- `phase3-runtime/out/live_gguf_3b.json|.log` (18:07), `live_gguf_7b.json|.log` (18:09), `live_smoke_3b.log` (18:05)
- `phase3-runtime/src/liveGgufSmoke.ts` (18:08), `src/localModel.ts` (18:57), `src/askLocal.ts` (18:12)
- `phase2/src/localModel.ts` (`LOCAL_MODELS`, `assertAllowedLocalModel`)
- `phase3-runtime/PIN.md` (mobile section), `phase1-slm/models/gguf/LOCK.json` (`bartowski_mobile_3b`), `phase3-runtime/artifacts/SHA256SUMS` (17:44), `artifacts/MANIFEST.json` (18:53)
- `phase3-runtime/scripts/fetch_gguf_mobile.sh` (18:53)
- `docs/notes/PHASE3_M1_LOCAL_GGUF.md`
- Note: LOCK.json lives at `phase1-slm/models/gguf/LOCK.json`, not `phase3-runtime/artifacts/` (evidence cites correctly).

## Checklist
| Item | Result |
|---|---|
| Claims vs measured | Evidence table (L1–L5 PASS both models) matches `out/live_gguf_3b.json` and `out/live_gguf_7b.json` (`"pass": true`, `netns_isolated: true`, backend `llama-cpp-python via ask_local.py --json`). |
| SHA-256 3B `9c9f56a3…3f94` | Identical in PIN, LOCK, MANIFEST `mobile_primary`, SHA256SUMS, fetch script `WANT_SHA`, 3B report. Bytes 1929903264 consistent. |
| SHA-256 7B `65b8fcd9…1423` | Identical in LOCK, MANIFEST, SHA256SUMS, `EXPECTED_GGUF_SHA256`, 7B report. PIN shows truncated digest only (residual). |
| Reject abliterated/uncensored/split | LOCK `reject` incl. `*-of-*`; MANIFEST `refuse_glob`; `assertAllowedLocalModel` regex `/abliterat|uncensor/i` + allowlist. Both files bartowski single-file. |
| Allowlist | Unlisted id → `local_model_not_permitted`. 3B selected only via explicit `SALOMON_GGUF` or `SALOMON_GGUF_ROLE=mobile`; LOCK `platform_resolve` / MANIFEST `default_paths` list 7B only → 3B does **not** silently replace desktop default. |
| Remote fallback | None found in askLocal; offline enforced by `unshare -rn` + Node net counter 0. |
| Overclaims | None. Evidence "Not claimed": "no on-phone run (Seeker build not started)", L4 "not an item-(5) refusal re-sign". No shipped/Play/public APK/GREEN claim. |
| Secrets | Only synthetic fixtures: `hunter22abc`, canonical BIP-39 test vector `abandon … about`. No real keys/credentials. |
| Refusal coverage | Live smoke exercises pre-model secret refusal (L2 password, L3 mnemonic → 422) + heuristic model decline (L4). Not an eval. |
| vs ASKLOCAL evidence | LIVE_GGUF supersedes the unit/stub-only ASKLOCAL evidence for the real-GGUF path; does not replace it. |

## Soft residuals (non-blocking)
1. L4 is keyword heuristic; 3B answer partially hedges: "If you need to verify the source's identity for legitimate journalistic or investigative purposes, you s…" — watch in item (5).
2. `localModelForEnv`: any non-3B `SALOMON_GGUF` filename is labelled 7B (e.g. 0.5B dev file would mislabel). Suggest label from verified sha.
3. PIN mobile heading "Mobile (Android / Play on-device)" + LOCK `channel: android_play` are intent labels — keep out of present-tense copy.
4. L3 BIP-39 fixture is crypto-flavoured; acceptable as key-material refusal (keys never reach model), but Model's Python suite dropped bip39 — align naming.
5. `fetch_gguf_mobile.sh` appends to SHA256SUMS after verify (fine) — make sure it never runs in CI with network.
6. `docs/notes/PHASE3_M1_LOCAL_GGUF.md` status still says "Runtime live smoke deferred. **Not M1 green**" — stale; update when Lead flips.
7. :3000 dev server still MODEL MISSING (chip honest).

## PS position on M1 GREEN
**OK for Lead to mark M1 GREEN**, scoped to: local ask + pinned GGUF path (7B desktop default, 3B mobile role via explicit env) running offline, fail-closed, with honest chips. Caveats: **not** item (5) — privacy-rebuild 8/8 remains INVALIDATED; no refusal-eval green claim; no Android/Play/on-phone shipped claim; no unsigned APK distribution (M-A0 soft-skim still queued); M2 (source masking) still NOT OPEN.


> **Tip note (Lead, ~21:30 PDT):** this stamp is now on `main`. Lead marked **Phase 3 M1 GREEN** on this SOFT CLEAR — scope: local ask + pinned GGUF offline fail-closed only. See `docs/STATUS.md`.
