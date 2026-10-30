# Salomon Android (M-A0) — goal, not shipped

**Goal:** a local-first private AI / personal agent for Android (Google Play / APK). **The Android app is not shipped.** There is no Play listing, no on-device GGUF inference yet, and M1 is not green. The web app (`apps/web`) is a companion.

## M-A0 scope
- Kotlin + Jetpack Compose single-activity shell: chat thread, composer, history drawer, mono engine chip, missing-model card.
- JNI facade `ai.salomon.core.SalomonCore.ask(prompt): AskResult` expecting native `libsalomon_core.so` (`System.loadLibrary("salomon_core")`) from `crates/salomon-core`.
- **Fail-closed without native:** if the library fails to load, every ask returns `MissingModel`. Nothing is sent anywhere; there is no remote/cloud fallback. A canned `Stub` reply exists only when `BuildConfig.SALOMON_ALLOW_ASK_STUB` is true (debug opt-in via `-PsalomonAllowAskStub=true`).
- Chip labels: `LOCAL` · `STUB` · `MODEL MISSING` · `REFUSED`.

## Native library drop (Release)
Release builds `crates/salomon-core` for `aarch64-linux-android` and copies it to
`app/src/main/jniLibs/arm64-v8a/libsalomon_core.so`. No binary is committed in M-A0.

## Build
Requires Android SDK (compileSdk 35) and JDK 17. Wrapper jar is not committed; run once:
```
gradle wrapper --gradle-version 8.9
./gradlew :app:assembleDebug
```
