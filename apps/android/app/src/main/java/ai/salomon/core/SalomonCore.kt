package ai.salomon.core

/**
 * JNI facade over libsalomon_core.so. Fail-closed: if the native library is absent
 * or errors, the answer is MissingModel. There is no remote fallback.
 */
object SalomonCore {
    /** Set by the app from BuildConfig.SALOMON_ALLOW_ASK_STUB (debug opt-in only). */
    @Volatile var allowStub: Boolean = false

    val nativeLoaded: Boolean = try {
        System.loadLibrary("salomon_core"); true
    } catch (_: Throwable) { false }

    private const val MISSING =
        "Local model missing. Install GGUF on-device or wait for Core — nothing was sent anywhere."

    /** Native: returns status code; text/error delivered via the returned array [code, text, error]. */
    @JvmStatic private external fun nativeAsk(prompt: String): Array<String?>

    fun ask(prompt: String): AskResult {
        if (prompt.isBlank()) return AskResult(AskStatus.Refused, "", "Empty prompt.")
        if (!nativeLoaded) {
            return if (allowStub) AskResult(AskStatus.Stub, "[stub] No model ran. Echo: ${prompt.take(200)}")
            else AskResult(AskStatus.MissingModel, "", MISSING)
        }
        return try {
            val r = nativeAsk(prompt)
            val status = AskStatus.fromCode(r.getOrNull(0)?.toIntOrNull() ?: AskStatus.MissingModel.code)
            AskResult(status, r.getOrNull(1).orEmpty(), r.getOrNull(2))
        } catch (t: Throwable) {
            AskResult(AskStatus.MissingModel, "", "Native core error: ${t.javaClass.simpleName}")
        }
    }
}
