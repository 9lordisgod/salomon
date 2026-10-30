# Security / Privacy Soft-Skim — M-A0 Compose unsigned dogfood APK

- Date: 2026-10-29 (America/Vancouver, PDT)
- Reviewer: Privacy & Safety (soft-skim, not a full audit)
- Artifact: `apps/android/dist/app-release-unsigned.apk` (6,817,201 bytes)
- Context: rebuild from d348a76+ (box has no .git — tip not verifiable on box)

## Verdict: SOFT CLEAR
OK for internal dogfood / yoxi install **after the user signs with their own keystore**.
External distribute still requires the user keystore and NO public Play claim.
**This skim does NOT authorize Play upload, a public APK link, signing, or pushing.**

## Checks
1. Identity — sha256 `f2b753417a9ef687e45e44df7ba3e61a3ec93eb89c41a8f155002a4384c2e088` matches dist, `.sha256` sidecar, and `app/build/outputs/apk/release/`. Unsigned: no META-INF *.RSA/*.SF/*.MF cert, no "APK Sig Block 42". Filename honest.
2. Native libs — `lib/arm64-v8a/libsalomon_core.so` (381,360 B) present, exports `Java_ai_salomon_core_SalomonCore_nativeAsk`. **arm64-v8a only** (no armeabi-v7a/x86_64 → emulators/old phones won't load). No separate `libsalomon_jni.so` (JNI is inside core; fine unless docs claim a separate lib).
3. Secrets — no PEM blocks, HF/OpenAI/GitHub/AWS tokens, storePassword/keyPassword in dex/arsc/so. Only hit: literal `PRIVATE KEY-----` fragment in libsalomon_core.so rodata = redaction-detector pattern, not a key.
4. Crypto residual — no Solana/NEAR/Seed Vault/wallet/DeFi/on-chain strings in dex/resources/so.
5. Overclaims — none found. UI copy: "On-device research for journalists, investigators, and researchers. Source-identity masking is M2 not shipped. Notes/library come later." No Play Store / shipped / GREEN claims in UI.
6. Manifest — no INTERNET permission, no cleartext flag, not debuggable. Exported = launcher activity + androidx profileinstaller receiver (DUMP-guarded, standard).
7. Fail-closed UX — "Local model missing. Install GGUF on-device or wait for Core … nothing was sent anywhere. Fail closed." Honest.
8. AAB — `dist/app-release.aab` present, also unsigned/hold; not skimmed in depth; no Play upload.

## Soft residuals (non-blocking)
- `android:allowBackup="true"` — consider `false` / dataExtractionRules before handling real source notes.
- arm64-only ABI; note in README for testers.
- "Ask on-device" button label is fine for dogfood but ensure it stays fail-closed when no GGUF is installed (on-device inference not claimed as live).
- Commit tip d348a76 not verifiable on box (no .git); provenance relies on FE sha256.
