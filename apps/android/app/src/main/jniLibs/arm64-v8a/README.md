# jniLibs / arm64-v8a

Release drops **`libsalomon_core.so`** here (`aarch64-linux-android`).

C ABI (Platform):
- `salomon_ask(const char*) -> char*` JSON `{"status":"MissingModel|Stub|Local|Refused","text":...,"error":...|null}` — free with `salomon_free_string`
- `salomon_version() -> const char*` (static)

The app builds a tiny **`libsalomon_jni.so`** (see `app/src/main/cpp/`) that exports:
- `Java_ai_salomon_core_SalomonCore_nativeAskJson`
- `Java_ai_salomon_core_SalomonCore_nativeVersion`

Do **not** put GGUF weights in the APK.
