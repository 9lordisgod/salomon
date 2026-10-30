package ai.salomon.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val Mono = darkColorScheme(
    primary = White, onPrimary = Black,
    secondary = Zinc400, onSecondary = Black,
    tertiary = Zinc300, onTertiary = Black,
    background = Black, onBackground = White,
    surface = Zinc950, onSurface = White,
    surfaceVariant = Zinc900, onSurfaceVariant = Zinc300,
    outline = Zinc700, error = White, onError = Black,
)

@Composable
fun SalomonTheme(content: @Composable () -> Unit) =
    MaterialTheme(colorScheme = Mono, content = content)
