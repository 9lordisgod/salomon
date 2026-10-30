# Salomon Android (M-A0 — **not shipped**)

Private local AI / personal agent shell for the **goal** Play/APK surface. Web remains the companion. **No GGUF in the APK.** No Solana / Seed Vault / crypto hero.

## What M-A0 is
- Kotlin + Jetpack Compose: chat + engine chip + missing-model card + history rail (abort on switch)
- Mono zinc (black / white / grey only)
- Fail-closed without native core → chip **MODEL MISSING**
- Engine chip: `LOCAL` | `STUB` | `MODEL MISSING` | `REFUSED`

## Core wiring
`System.loadLibrary("salomon_core")` → `libsalomon_core.so` at `app/src/main/jniLibs/arm64-v8a/`.

JNI (Compose):
- `Java_ai_salomon_core_SalomonCore_nativeAsk` → `[statusCode, text, error]`
- Codes: **0 MissingModel · 1 Stub · 2 Local · 3 Refused**

Kotlin: `SalomonCore.ask(prompt): AskResult`. C ABI JSON is **not** used by the UI.

## Build
```bash
# from repo root (Release scripts when present)
source .android-env.sh   # after NDK install
./scripts/build_android_native.sh
./scripts/assemble_apk.sh
```

- NDK **r28** + AGP **≥8.5.1** (16 KB pages) preferred
- ABI: **arm64-v8a only**
- Debug stub opt-in: `-PsalomonAllowAskStub=true` (never release)

## Not claimed
On-device live GGUF, Play listing, M1 green, M2 mask, hybrid remote, Settings/REMOTE/Sources/Approvals in this shell.
