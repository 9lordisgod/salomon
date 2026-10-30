# salomon-core (M-A0 stub — not shipped)

The aim is for this to become Salomon's Rust core: fail-closed ask, GGUF resolution, and the credential boundary, loaded over JNI as `libsalomon_core.so`.

**M-A0 status:** stub only. llama.cpp is not linked, there are no remote calls, and `Local` cannot be reached.

Behavior order: secret-shaped input → `Refused`; `SALOMON_ASK_STUB=1` → `Stub`; `SALOMON_GGUF` unset, missing, or a `*-of-*` shard → `MissingModel`; an existing file → `MissingModel` with `runner_not_linked`.

API: `ask`, `ask_with_env`, `AskStatus`, `AskResult`, and the C ABI `salomon_version`, `salomon_ask` (JSON, free with `salomon_free_string`). The JNI module is behind feature `jni` and is a stub for now.

Test with `cargo test -p salomon-core`. See `docs/notes/ANDROID_HYBRID_DECISION.md`.
