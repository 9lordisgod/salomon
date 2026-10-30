package ai.salomon.core

/** Honest engine status. Matches salomon-core JSON `"status"` strings. */
enum class AskStatus {
    MissingModel, Stub, Local, Refused;

    companion object {
        fun fromWire(raw: String?): AskStatus = when (raw?.trim()) {
            "Stub" -> Stub
            "Local" -> Local
            "Refused" -> Refused
            "MissingModel" -> MissingModel
            else -> MissingModel // fail closed
        }
    }
}
