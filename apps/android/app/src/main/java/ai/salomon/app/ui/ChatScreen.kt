package ai.salomon.app.ui

import ai.salomon.app.ui.theme.*
import ai.salomon.core.AskStatus
import ai.salomon.core.SalomonCore
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

enum class Role { User, Assistant, Refusal }
data class Message(val role: Role, val text: String)
class ChatThread(val id: Int, val messages: SnapshotStateList<Message> = mutableStateListOf()) {
    val title: String get() = messages.firstOrNull { it.role == Role.User }?.text?.take(40) ?: "New chat"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen() {
    val scope = rememberCoroutineScope()
    val drawer = rememberDrawerState(DrawerValue.Closed)
    val threads = remember { mutableStateListOf(ChatThread(0)) }
    var currentId by remember { mutableIntStateOf(0) }
    var status by remember { mutableStateOf(
        if (SalomonCore.allowStub) AskStatus.Stub else AskStatus.MissingModel) }
    var inFlight by remember { mutableStateOf<Job?>(null) }
    var input by remember { mutableStateOf("") }
    val current = threads.first { it.id == currentId }

    fun switchTo(id: Int) {
        inFlight?.cancel(); inFlight = null
        currentId = id
        scope.launch { drawer.close() }
    }

    fun send() {
        val prompt = input.trim()
        if (prompt.isEmpty() || inFlight != null) return
        input = ""
        val thread = current
        thread.messages.add(Message(Role.User, prompt))
        inFlight = scope.launch {
            try {
                val r = withContext(Dispatchers.IO) { SalomonCore.ask(prompt) }
                status = r.status
                when (r.status) {
                    AskStatus.Local, AskStatus.Stub -> thread.messages.add(Message(Role.Assistant, r.text))
                    AskStatus.Refused -> thread.messages.add(Message(Role.Refusal, r.error ?: "Refused."))
                    AskStatus.MissingModel -> Unit // card shows; nothing invented
                }
            } finally { inFlight = null }
        }
    }

    ModalNavigationDrawer(
        drawerState = drawer,
        drawerContent = {
            ModalDrawerSheet(drawerContainerColor = Zinc950) {
                Text("History", color = Zinc400, modifier = Modifier.padding(16.dp))
                TextButton(onClick = {
                    val t = ChatThread((threads.maxOf { it.id }) + 1); threads.add(0, t); switchTo(t.id)
                }) { Text("+ New chat", color = White) }
                HorizontalDivider(color = Zinc800)
                threads.forEach { t ->
                    Text(t.title, color = if (t.id == currentId) White else Zinc400,
                        modifier = Modifier.fillMaxWidth().clickable { switchTo(t.id) }.padding(16.dp))
                }
            }
        },
    ) {
        Scaffold(
            containerColor = Black,
            topBar = {
                TopAppBar(
                    title = { Text("Salomon", color = White) },
                    navigationIcon = {
                        TextButton(onClick = { scope.launch { drawer.open() } }) { Text("≡", color = White, fontSize = 20.sp) }
                    },
                    actions = { EngineChip(status, Modifier.padding(end = 12.dp)) },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Black),
                )
            },
            bottomBar = {
                Column(Modifier.background(Black).imePadding().padding(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        OutlinedTextField(
                            value = input, onValueChange = { input = it },
                            modifier = Modifier.weight(1f),
                            placeholder = { Text("Ask locally…", color = Zinc500) },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Zinc400, unfocusedBorderColor = Zinc700,
                                focusedTextColor = White, unfocusedTextColor = White, cursorColor = White),
                        )
                        Spacer(Modifier.width(8.dp))
                        if (inFlight != null) {
                            OutlinedButton(onClick = { inFlight?.cancel(); inFlight = null }) { Text("Stop", color = White) }
                        } else {
                            Button(onClick = ::send, colors = ButtonDefaults.buttonColors(containerColor = White, contentColor = Black)) { Text("Send") }
                        }
                    }
                    Text("Local by default · credentials stay out of the model",
                        color = Zinc500, fontSize = 11.sp, modifier = Modifier.padding(top = 6.dp))
                }
            },
        ) { pad ->
            Column(Modifier.padding(pad).fillMaxSize().padding(horizontal = 12.dp)) {
                if (current.messages.isEmpty() || status == AskStatus.MissingModel) {
                    if (current.messages.isEmpty()) Text("What do you want to work on?",
                        color = White, fontSize = 22.sp, modifier = Modifier.padding(vertical = 24.dp))
                    if (status == AskStatus.MissingModel) MissingModelCard(Modifier.padding(bottom = 12.dp))
                }
                LazyColumn(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(current.messages) { Bubble(it) }
                }
            }
        }
    }
}

@Composable
private fun Bubble(m: Message) {
    val user = m.role == Role.User
    Box(Modifier.fillMaxWidth(), contentAlignment = if (user) Alignment.CenterEnd else Alignment.CenterStart) {
        Text(
            text = if (m.role == Role.Refusal) "REFUSED — ${m.text}" else m.text,
            color = if (user) Black else if (m.role == Role.Refusal) Zinc400 else White,
            modifier = Modifier
                .widthIn(max = 320.dp)
                .background(if (user) White else Zinc900, RoundedCornerShape(10.dp))
                .border(1.dp, if (user) White else Zinc800, RoundedCornerShape(10.dp))
                .padding(10.dp),
        )
    }
}
