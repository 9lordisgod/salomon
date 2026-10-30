package ai.salomon.core

data class AskResult(
    val status: AskStatus,
    val text: String,
    val error: String? = null,
)
