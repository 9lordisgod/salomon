package ai.salomon.core

/** Honest engine status. Mirrors the salomon-core C ABI status codes. */
enum class AskStatus(val code: Int) {
    MissingModel(0), Stub(1), Local(2), Refused(3);

    companion object {
        fun fromCode(code: Int): AskStatus = entries.firstOrNull { it.code == code } ?: MissingModel
    }
}
