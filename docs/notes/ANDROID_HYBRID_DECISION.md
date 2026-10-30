# Android hybrid architecture — Lead decision (2026-10-29 ~19:00 PDT)

**Status:** Lead **LOCKED**. Team refine folded (Platform + Frontend + Release, ~19:02 PDT).
**Product:** pure local-first AI; Android (Play/APK) is the **goal** surface — **not shipped**. M1 not green; M2 eng NOT OPEN. No crypto / Solana Mobile primary.

## Decision (one line)

**Rust native core (JNI / UniFFI) for privacy-critical on-device path; Kotlin + Jetpack Compose for the Android UI.** TypeScript web/CLI stay secondary. Python stays experiments/scripts only — not the shipping app path.

## Why this split

- **Ship speed:** Compose is the shortest path to a Play/APK shell with honest local-first UI. React Native/Expo adds a JS bridge on top of native FFI for no gain on a chat-first desk (FE concur).
- **Privacy guarantees:** sanitizer, fail-closed ask, model-runner boundary, and credential hygiene belong in one audited native library — not reimplemented in Kotlin/TS.
- **Performance / safety:** llama.cpp / GGUF belongs behind a Rust FFI boundary; UI stays easy-to-iterate Kotlin.
- **Honesty:** do **not** claim on-device phone inference, Play listing, or M1 green until those land. M-A0 ships with `MISSING` / stub engine chip only.

## What moves to Rust — order (Platform)

| Priority | Move to Rust first | Why | Stays elsewhere for now |
|---|---|---|---|
| **P0** | Credential boundary (never raw secrets in model payload) | Trust floor | UI may detect paste UX; policy in Rust |
| **P0** | Fail-closed `ask` (scrub → assertNoSecrets → complete → scrub out) | Product floor | TS `askLocal` keeps desktop/web until parity |
| **P0** | GGUF discovery (`role=mobile` / MANIFEST; refuse split shards; no auto-download) | On-device honesty | Python `ask_local.py` = dogfood/scripts only |
| **P0→A1** | llama.cpp load+complete wrapper | On-device core | **Out of M-A0** — stub `.so` only in M-A0 |
| **P1** | Sanitizer / source-mask (parity tests) | After first local-ask smoke | M2 eng still NOT OPEN |
| **P2** | Agent-loop core (propose-only) | After ask green on device | phase2 TS remains desktop reference |
| **Later** | Attestation / verified-remote | Opt-in only | Keep ATTEST_* TS client; not Android MVP |

## Android UI (Frontend — LOCKED Compose)

**Pick: Kotlin + Jetpack Compose.** Prefer **UniFFI → Kotlin** generated bindings over hand JNI (FE); thin hand JNI OK if UniFFI blocks M-A0.

### M-A0 screens only

| # | Surface | Success |
|---|---|---|
| 1 | Chat thread (single activity) | Composer + messages; mono zinc |
| 2 | Engine chip in top bar | `LOCAL` / `STUB` / `MISSING` — never fake LOCAL |
| 3 | Missing-model card (empty state, not a route) | Fail-closed copy; no BYOK/cloud CTA |
| 4 | History rail | Local threads; **abort in-flight ask on switch** |

**Out of M-A0:** Settings sheet, REMOTE toggle, Sources/mask demo, Approvals, Seeker/Seed Vault/wallet.

## Packaging (Release)

See also `docs/notes/ANDROID_PLAY_PACKAGING_OUTLINE.md`.

- **M-A0 artifact:** arm64-v8a `.so` stub + Compose APK **and** AAB (Play internal + sideload).
- **GGUF:** never in base package (3B ~1.9GB / 7B ~4.7GB). Optional later download / PAD; missing → fail closed.
- **ABI:** arm64-v8a release only; x86_64 emulator optional.
- **16 KB pages:** AGP ≥8.5.1 + NDK r28+ (Play Android 15+).
- **llama.cpp NDK:** out of M-A0 (fragile); wire in M-A1.
- **Listing honesty:** no “on-device model” claim until optional fetch ships.

## First milestone — M-A0 OPEN

**“Rust fail-closed ask stub + Compose shell”** — scaffold **unfrozen for M-A0 only**.

Success criteria:

1. Rust crates expose `ask(prompt) → { status: MissingModel | Stub | Local, text, error? }` — **MissingModel** when no GGUF (fail closed; never invents remote answers).
2. UniFFI or thin JNI + Kotlin wrapper; device/emulator smoke.
3. Compose app: chat + chip + missing card + history rail with abort-on-switch.
4. `scripts/assemble_apk.sh` (or equiv) → APK + AAB sha256 note; Play internal testing optional.
5. **No claim:** Play public listing, on-device live GGUF, M1 green, M2 mask, hybrid remote.

### Owners

| Owner | M-A0 work |
|---|---|
| **Platform** | Open crates (below); fail-closed ask stub + FFI exports |
| **Frontend** | `apps/android/` Compose shell (mono, chat, chip, missing, history) |
| **Release** | cargo-ndk → arm64 `.so`; AGP/NDK 16KB gate; assemble APK+AAB |
| Runtime/Model | Advise FFI shape vs existing GGUF pin; do not block M-A0 on full runner |
| PS | Soft skim before any public APK claim |

**M-A1 (gated):** link llama.cpp, load pinned 3B Q4 from app storage, `LOCAL` only when offline complete succeeds. Mobile 3B not refusal-eval green — no product claim.

## Files / crates to create (Platform layout)

```
crates/
  salomon-core/     # vault + secret patterns + OfflineAskResult types
  salomon-gguf/     # MANIFEST parse, role resolve, shard refuse, optional sha256
  salomon-infer/    # llama.cpp FFI (M-A1; stub OK in M-A0)
  salomon-jni/      # cdylib JNI / UniFFI entrypoints → core+gguf+infer
apps/
  android/          # Kotlin+Compose UI
  android/README.md # goal tense; not shipped
docs/notes/ANDROID_HYBRID_DECISION.md
docs/notes/ANDROID_PLAY_PACKAGING_OUTLINE.md
```

Workspace `Cargo.toml` at repo root or under `crates/`. Do **not** put Rust under `phase3-platform/` (keeps npm packages unscoped/clean). Alternate single-crate name `salomon-native` OK if Platform prefers one cdylib for M-A0 then splits.

## Explicit non-goals (M-A0)

- Solana Mobile / Seed Vault / wallets / DeFi
- Pure Rust UI / React Native
- Shipping Python on device
- Bundling GGUF / claiming on-device model
- Claiming M1 green / M2 / Play live public
- Auto-fallback local → remote

## Team refine log

- **Frontend:** Compose not RN; UniFFI preferred; M-A0 screen cut (chat/chip/missing/history only).
- **Platform:** Rust-first = creds + offlineAsk + GGUF discovery + (A1) llama; sanitizer/agent second; crate split above.
- **Release:** stub `.so` M-A0; APK+AAB; 16KB/AGP/NDK gate; GGUF never in base; outline doc parallel.
- **Eval:** phase3-m1-offline-ask CI green on `a9f4be3` (desktop path unchanged).
- **Docs:** pure-AI goal tense + archive deletes in flight (separate track).

— Lead Architect · Salomon
