package ai.salomon.core

/**
 * Facade over libsalomon_core.so (C ABI → JSON).
 *
 * Platform exports: salomon_ask / salomon_free_string / salomon_version.
 * A tiny JNI shim (`salomon_jni_shim.c`) exposes [nativeAskJson] until/unless the
 * crate ships Java_* itself. Fail-closed if the library is absent — no remote.
 */
object SalomonCore {
    /** Set by the app from BuildConfig.SALOMON_ALLOW_ASK_STUB (debug opt-in only). */
    @Volatile var allowStub: Boolean = false

    val nativeLoaded: Boolean = try {
        // Prefer shim lib (links prebuilt salomon_core); fall back to core if it exports JNI.
        try {
            System.loadLibrary("salomon_jni")
        } catch (_: UnsatisfiedLinkError) {
            System.loadLibrary("salomon_core")
        }
        true
    } catch (_: Throwable) {
        false
    }

    private const val MISSING =
        "Local model missing. Install GGUF on-device or wait for Core — nothing was sent anywhere."

    /** JNI → JSON string from salomon_ask (caller-free done in shim). */
    @JvmStatic private external fun nativeAskJson(prompt: String): String

    /** Optional version string from salomon_version; empty if unavailable. */
    @JvmStatic private external fun nativeVersion(): String

    /** Public wire: JSON from Core (or fail-closed MissingModel JSON). */
    fun askJson(prompt: String): String = ask(prompt).let { r ->
        val err = r.error?.let { "\"${escape(it)}\"" } ?: "null"
        """{"status":"${r.status.name}","text":"${escape(r.text)}","error":$err}"""
    }

    fun ask(prompt: String): AskResult {
        if (prompt.isBlank()) return AskResult(AskStatus.Refused, "", "Empty prompt.")
        if (!nativeLoaded) {
            return if (allowStub) AskResult(AskStatus.Stub, "[stub] No model ran. Echo: ${prompt.take(200)}")
            else AskResult(AskStatus.MissingModel, "", MISSING)
        }
        return try {
            AskResult.fromJson(nativeAskJson(prompt))
        } catch (t: Throwable) {
            AskResult(AskStatus.MissingModel, "", "Native core error: ${t.javaClass.simpleName}")
        }
    }

    fun version(): String = try {
        if (nativeLoaded) nativeVersion() else ""
    } catch (_: Throwable) { "" }

    private fun escape(s: String) = s
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
        .replace("\t", "\\t")
}
