package ai.salomon.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import ai.salomon.app.ui.ChatScreen
import ai.salomon.app.ui.theme.SalomonTheme
import ai.salomon.core.SalomonCore

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        SalomonCore.allowStub = BuildConfig.SALOMON_ALLOW_ASK_STUB
        setContent { SalomonTheme { ChatScreen() } }
    }
}
