package ai.salomon.core

/**
 * JNI facade over libsalomon_core.so.
 * Platform exports: Java_ai_salomon_core_SalomonCore_nativeAsk → String?[3] = [statusCode, text, error]
 * Codes: 0 MissingModel · 1 Stub · 2 Local · 3 Refused.
 * Fail-closed if the library is absent — no remote fallback.
 */
object SalomonCore {
    /** Set by the app from BuildConfig.SALOMON_ALLOW_ASK_STUB (debug opt-in only). */
    @Volatile var allowStub: Boolean = false

    val nativeLoaded: Boolean = try {
        System.loadLibrary("salomon_core"); true
    } catch (_: Throwable) { false }

    private const val MISSING =
        "Local model missing. Install GGUF on-device or wait for Core — nothing was sent anywhere."

    /** Native: [statusCode, text, error] — error may be null. */
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
