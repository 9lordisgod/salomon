# Salomon Android (M-A0 — **not shipped**)

Local research desk for journalists, investigators, and researchers. Web remains the companion. **No GGUF in the APK.** No Solana / Seed Vault / crypto hero (that track is `salomon-solana` / Solana Mobile FE).

## What M-A0 is
- Kotlin + Jetpack Compose: chat + engine chip + missing-model card + history rail (abort on switch / new chat)
- Zinc mono (black / white / grey only)
- Fail-closed without native core → chip **MODEL MISSING**
- Engine chip: `LOCAL` | `STUB` | `MODEL MISSING` | `REFUSED`
- Entry: `MainActivity` → `SalomonTheme` → `ChatScreen` (not a TextView dogfood)

## Core wiring
`System.loadLibrary("salomon_core")` → `libsalomon_core.so` at `app/src/main/jniLibs/arm64-v8a/`.

JNI (Compose):
- `Java_ai_salomon_core_SalomonCore_nativeAsk` → `[statusCode, text, error]`
- Codes: **0 MissingModel · 1 Stub · 2 Local · 3 Refused**

## Claims / copy
See `docs/notes/CLAIMS_FLAGS_PROFESSIONAL_NICHE.md`. No consumer onboarding. Source-identity masking = M2 not shipped. Approvals/Sources not in this shell.

## Build
```bash
source .android-env.sh   # after NDK install
./scripts/build_android_native.sh
./scripts/assemble_apk.sh
```

- NDK **r28** + AGP **≥8.5.1** (16 KB pages) preferred
- ABI: **arm64-v8a only**
- Debug stub: `-PsalomonAllowAskStub=true` (never release)
- Theme: `android:Theme.Material.NoActionBar` (no AppCompat)

## Not claimed
On-device live GGUF, Play listing, M1 green, M2 mask, M3 Approvals, hybrid remote.
