# Android hybrid architecture — Lead decision (2026-10-29 ~19:00 PDT)

**Status:** Lead LOCKED for planning. Platform / Frontend / Release refine packaging details; this note is the acting recommendation.
**Product:** pure local-first AI; Android (Play/APK) is the **goal** surface — **not shipped**. M1 not green; M2 eng NOT OPEN. No crypto / Solana Mobile primary.

## Decision (one line)

**Rust native core (JNI) for privacy-critical on-device path; Kotlin + Jetpack Compose for the Android UI.** TypeScript web/CLI stay secondary. Python stays experiments/scripts only — not the shipping app path.

## Why this split

- **Ship speed:** Compose is the shortest path to a Play/APK shell with honest local-first UI. React Native/Expo adds a JS bridge on top of JNI for no gain on a chat-first desk.
- **Privacy guarantees:** sanitizer, fail-closed ask, model-runner boundary, and credential hygiene belong in one audited native library — not reimplemented in Kotlin/TS.
- **Performance / safety:** llama.cpp / GGUF belongs behind a Rust FFI boundary; UI stays easy-to-iterate Kotlin.
- **Honesty:** do **not** claim on-device phone inference, Play listing, or M1 green until those land. First milestone may ship with `MISSING` / stub engine chip only.

## What moves to Rust — order

| Priority | Move to Rust first | Why | Stays elsewhere for now |
|---|---|---|---|
| **P0** | Fail-closed `ask` orchestration (missing model → hard fail; no silent remote) | Product floor | TS `askLocal` keeps desktop/web until parity |
| **P0** | Local model runner wrapper (llama.cpp / GGUF load+complete) | On-device core | Python `ask_local.py` = dogfood/scripts only |
| **P1** | Sanitizer / source-mask engine (deterministic redact + refuse hooks) | Safety-critical; shared with M2 later | Current TS/Python sanitizer until port; M2 eng still NOT OPEN |
| **P1** | Credential-boundary helpers (never pass secrets into prompt; scrub pasted secrets) | Fail-closed | UI may detect paste UX, but policy lives in Rust |
| **P2** | Agent loop / tool guard (propose-only; forbidden tool names) | After ask path green on device | phase2 TS agent loop remains desktop reference |
| **Later** | Attestation client | Opt-in remote only after M1+M2 | Keep ATTEST_* TS client; not Android MVP |

**Do not port first:** full web UI, CLI polish, Colab/eval notebooks, archive docs.

## Android UI (Frontend recommendation — Lead pick)

**Pick: Kotlin + Jetpack Compose** (single-activity chat-first Research desk).

Minimal surfaces (mono zinc B/W/grey; Sources / Approvals **off** main path):

1. **Chat thread** — composer + messages; engine chip `LOCAL` / `STUB` / `MISSING` (honest).
2. **New chat / history rail** — local only; abort in-flight ask on switch.
3. **Model status card** — missing GGUF → clear fail-closed empty state (no fake LOCAL).
4. **Settings (thin)** — model path / download status; no BYOK-as-default; no remote-preferred toggle.

Compose calls Rust via a thin JNI/Kotlin wrapper (`SalomonCore.ask(prompt) → AskResult`). No React Native for MVP.

## Packaging (Release outline — Lead)

- **Crate:** `crates/salomon-core` (cdylib + staticlib) + `crates/salomon-android` JNI glue (or `jni` feature on core).
- **Android module:** `apps/android/` (Gradle + Compose). Depends on AAR that packages `arm64-v8a` `.so` first (x86_64 emulator optional).
- **Build:** `cargo-ndk` / `cargo-apk` or Gradle rust-android-gradle plugin; NDK r26+.
- **GGUF:** **do not** bundle multi-GB weights in the Play APK. Download/verify on first run (or sideload path); app runs fail-closed until present. Prefer 3B Q4_K_M for phone experiments when unlocked.
- **Play blockers to plan for:** 16 KB page size (newer NDK/AGP), ABI splits, target API, Play app size / asset delivery if we ever ship weights, privacy policy for on-device processing, no misleading “AI in cloud” listing copy.
- **Sideload APK:** same AAR; unsigned/debug OK for dogfood; release signing via Play App Signing later.

## First milestone (actionable)

**M-A0 — “Rust fail-closed ask + Compose shell”** (scaffold unfreeze for this only)

Success criteria (honest):

1. `crates/salomon-core` exposes `ask(prompt) -> { status: MissingModel | Stub | Local, text, error? }` — **MissingModel** when no GGUF (fail closed; never invents an answer from remote).
2. JNI + Kotlin wrapper; unit test on JVM/host if possible + device smoke.
3. Compose app: one chat screen, engine chip reflects status, empty-model card when Missing.
4. Docs: `docs/notes/ANDROID_HYBRID_DECISION.md` (this file) + short `apps/android/README.md` (goal tense; not shipped).
5. **No claim:** Play listing, on-device live GGUF, M1 green, M2 mask, hybrid remote.

Suggested owners:

- Platform: crate layout + JNI + fail-closed ask stub (wire real llama.cpp in M-A1).
- Frontend: Compose shell + chip + missing card.
- Release: Gradle/NDK pipeline + arm64 APK dogfood artifact.
- Runtime/Model: advise FFI to existing GGUF pin; do not block M-A0 on full runner.
- PS: soft skim before any public APK claim.

**M-A1 (next, gated):** link llama.cpp, load pinned 3B GGUF from app storage, LOCAL chip only when complete succeeds offline.

## Files / crates to create

```
crates/salomon-core/          # Rust: ask + (later) sanitizer + runner
crates/salomon-core/src/lib.rs
crates/salomon-core/Cargo.toml
apps/android/                 # Kotlin Compose app
apps/android/README.md
docs/notes/ANDROID_HYBRID_DECISION.md   # this decision
```

Optional later: `crates/salomon-sanitizer`, `crates/salomon-llama` if core grows.

## Explicit non-goals (this milestone)

- Solana Mobile / Seed Vault / wallets / DeFi
- Pure Rust UI
- Shipping Python on device
- Claiming M1 green / M2 / Play live
- Auto-fallback local → remote

## Open for teammate refine (non-blocking)

- Exact Gradle plugin vs cargo-ndk
- Whether sanitizer ports in M-A0 (Lead: **stub trait only** in M-A0; real port M-A1/M2)
- Emulator ABI set

— Lead Architect · Salomon
