package ai.salomon.core

data class AskResult(
    val status: AskStatus,
    val text: String,
    val error: String? = null,
) {
    companion object {
        /** Parse Platform C ABI JSON: {"status":"MissingModel|Stub|Local|Refused","text":...,"error":...|null} */
        fun fromJson(json: String): AskResult {
            val status = AskStatus.fromWire(field(json, "status"))
            val text = field(json, "text").orEmpty()
            val errRaw = field(json, "error")
            val error = if (errRaw == null || errRaw == "null") null else errRaw
            return AskResult(status, text, error)
        }

        // Tiny extractor — avoids org.json dependency; statuses/text are simple wires.
        private fun field(json: String, key: String): String? {
            val keyed = "\"$key\""
            val i = json.indexOf(keyed)
            if (i < 0) return null
            var j = json.indexOf(':', i + keyed.length)
            if (j < 0) return null
            j += 1
            while (j < json.length && json[j].isWhitespace()) j++
            if (j >= json.length) return null
            if (json.startsWith("null", j)) return "null"
            if (json[j] != '"') return null
            j++
            val sb = StringBuilder()
            while (j < json.length) {
                val c = json[j++]
                when {
                    c == '\\' && j < json.length -> {
                        when (val n = json[j++]) {
                            'n' -> sb.append('\n')
                            't' -> sb.append('\t')
                            'r' -> sb.append('\r')
                            '"' -> sb.append('"')
                            '\\' -> sb.append('\\')
                            'u' -> {
                                if (j + 4 <= json.length) {
                                    val hex = json.substring(j, j + 4)
                                    sb.append(hex.toInt(16).toChar())
                                    j += 4
                                }
                            }
                            else -> sb.append(n)
                        }
                    }
                    c == '"' -> return sb.toString()
                    else -> sb.append(c)
                }
            }
            return sb.toString()
        }
    }
}
