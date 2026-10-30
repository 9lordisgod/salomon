# jniLibs / arm64-v8a

Release drops **`libsalomon_core.so`** here (`aarch64-linux-android`).

JNI (Compose uses this):
- `Java_ai_salomon_core_SalomonCore_nativeAsk` → `String?[3]` = `[statusCode, text, error]`
- Codes: **0 MissingModel · 1 Stub · 2 Local · 3 Refused** (error null when absent)

C ABI (`salomon_ask` JSON / `salomon_free_string` / `salomon_version`) is secondary for Release/scripts — **not** used by Compose.

Do **not** put GGUF weights in the APK.
