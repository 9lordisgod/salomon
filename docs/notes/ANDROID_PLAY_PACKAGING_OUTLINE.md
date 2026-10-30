# Android Play / APK packaging outline (Release)

**Date:** 2026-10-29  
**Aligns to:** [`ANDROID_HYBRID_DECISION.md`](./ANDROID_HYBRID_DECISION.md) (Lead LOCKED)  
**Constraints:** standard Android; GGUF **not in APK**; ship fast.  
**Milestone:** **M-A0** — arm64 APK dogfood with **MissingModel** fail-closed; no on-device inference claim.

## Packaging outline

```
crates/salomon-core/            # Rust cdylib+staticlib — ask orchestration (P0)
  Cargo.toml                    # crate-type cdylib; optional jni feature
  src/lib.rs                    # ask() -> MissingModel | Stub | Local
crates/salomon-android/         # optional thin JNI glue (or jni feature on core)
apps/android/                   # Kotlin + Jetpack Compose
  app/src/main/jniLibs/arm64-v8a/libsalomon_core.so
  README.md                     # goal tense; not shipped
scripts/
  build_android_native.sh       # cargo-ndk → jniLibs (arm64-v8a)
  assemble_apk.sh               # assembleRelease APK (+ AAB when Play track opens)
phase3-runtime/artifacts/        # GGUF MANIFEST/LOCK — NEVER packaged into APK
```

**Wire (Release-owned build path):**
1. `cargo-ndk` (or Gradle rust-android plugin) builds `salomon-core` for **`arm64-v8a`** → `jniLibs/`.
2. Thin JNI: `SalomonCore.ask(prompt) → AskResult{status, text, error?}` with status enum matching Lead: **`MissingModel` | `Stub` | `Local`**.
3. Compose shell (Frontend) shows engine chip + missing-model card; Release only gates that the `.so` loads and APK installs.
4. Artifacts: **sideload APK** first (M-A0 dogfood); **AAB** when Play internal track is ready — same arm64 binary family.
5. **GGUF:** not in APK/AAB. Optional later download (`role=mobile` 3B) is **M-A1+**; M-A0 must fail closed with MissingModel.

## Blockers

### Play Store (plan now; M-A0 may be sideload-only)
| Blocker | Mitigation for ship-fast |
|---------|--------------------------|
| **GGUF size** (3B ~1.93GB / 7B ~4.7GB) | Never bundle; M-A0 = MissingModel path only |
| **ABI** | **arm64-v8a only** in dogfood/release; x86_64 debug/emulator optional |
| **16 KB page size** | Prefer **NDK r28+** + AGP ≥8.5.1 (Lead floor NDK r26+; Release targets r28 for default 16 KB ELF align) |
| **llama.cpp NDK** | **Out of M-A0** — stub/`MissingModel` only; real runner = M-A1 |
| **Listing honesty** | No Play claim of on-device model / M1 green |
| **Signing** | Debug/sideload OK for M-A0; Play App Signing later |

### Sideload APK (M-A0 primary)
| Blocker | Mitigation |
|---------|------------|
| Unknown-sources install | One-pager in `apps/android/README.md` |
| Single-APK bloat | arm64-only; no assets/GGUF |
| 16 KB devices | Same NDK/AGP bar as Play |
| “Just zip the GGUF in” | **Refuse** — breaks size + honesty |

## M-A0 packaging checklist (Release slice)

**Goal:** installable **arm64** release/debug APK dogfood; native lib loads; ask returns **MissingModel** when no GGUF; **zero** GGUF bytes inside the APK.

- [ ] Gradle module `apps/android/` + `crates/salomon-core` cdylib (Platform owns ask stub semantics; Release owns pipeline)
- [ ] `scripts/build_android_native.sh` → `jniLibs/arm64-v8a/`
- [ ] NDK **r28+** (or r26+ with explicit 16 KB linker flags) + AGP ≥8.5.1
- [ ] `scripts/assemble_apk.sh` → APK; print versionCode + **sha256** of APK
- [ ] APK analyzer / `zipinfo`: confirm **no** `*.gguf` and no multi-GB assets
- [ ] Device smoke: install APK → open → MissingModel / missing card (Frontend); Release confirms artifact hash + ABI
- [ ] `apps/android/RELEASE.md` (or README section): artifact name, sha256, ABI, “GGUF not included”
- [ ] Explicit non-goals: llama.cpp link, GGUF fetch UX, Play public listing, 7B on phone, crypto branding

**Exit (Release):** APK artifact + checksum published to team (sideload); Play AAB optional follow-up.  
**Exit (product honesty):** chip shows MissingModel/STUB — never fake LOCAL.

## M-A1+ (gated — not this checklist)
Link llama.cpp; optional fetch+verify `salomon-qwen25-3b-instruct-Q4_K_M.gguf` (`role=mobile`); LOCAL only when offline complete succeeds.

## Ownership
| Role | Owns |
|------|------|
| **Release** | NDK/Gradle packaging scripts, arm64 APK/AAB, ABI/size/16KB gates, APK sha256, “no GGUF in APK” verify |
| **Platform** | `salomon-core` ask stub → MissingModel, JNI surface |
| **Frontend** | Compose shell, engine chip, missing card |
| **Model/Runtime** | GGUF pins / desktop parity — do not block M-A0 |
