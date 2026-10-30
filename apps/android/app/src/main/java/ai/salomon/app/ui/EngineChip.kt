package ai.salomon.app.ui

import ai.salomon.app.ui.theme.*
import ai.salomon.core.AskStatus
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

fun AskStatus.chipLabel(): String = when (this) {
    AskStatus.Local -> "LOCAL"
    AskStatus.Stub -> "STUB"
    AskStatus.MissingModel -> "MODEL MISSING"
    AskStatus.Refused -> "REFUSED"
}

@Composable
fun EngineChip(status: AskStatus, modifier: Modifier = Modifier) {
    val fg = if (status == AskStatus.Local) White else Zinc400
    Text(
        text = status.chipLabel(),
        color = fg,
        fontFamily = FontFamily.Monospace,
        fontSize = 11.sp,
        modifier = modifier
            .border(1.dp, Zinc700, RoundedCornerShape(4.dp))
            .padding(horizontal = 8.dp, vertical = 3.dp),
    )
}
