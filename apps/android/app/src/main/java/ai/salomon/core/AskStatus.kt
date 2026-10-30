package ai.salomon.core

/** Honest engine status. Mirrors salomon-core JNI status codes (0/1/2/3). */
enum class AskStatus(val code: Int) {
    MissingModel(0), Stub(1), Local(2), Refused(3);

    companion object {
        fun fromCode(code: Int): AskStatus = entries.firstOrNull { it.code == code } ?: MissingModel
    }
}
