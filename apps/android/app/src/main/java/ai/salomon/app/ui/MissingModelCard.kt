package ai.salomon.app.ui

import ai.salomon.app.ui.theme.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun MissingModelCard(modifier: Modifier = Modifier) {
    Column(
        modifier
            .fillMaxWidth()
            .border(1.dp, Zinc700, RoundedCornerShape(8.dp))
            .background(Zinc950, RoundedCornerShape(8.dp))
            .padding(16.dp)
    ) {
        Text("MODEL MISSING", color = White, fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.Bold, fontSize = 13.sp)
        Spacer(Modifier.height(6.dp))
        Text(
            "Local model missing. Install GGUF on-device or wait for Core — nothing was sent anywhere.",
            color = Zinc400, fontSize = 14.sp,
        )
    }
}
