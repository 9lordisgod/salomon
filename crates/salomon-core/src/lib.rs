//! Salomon fail-closed ask core — M-A0 stub (no llama.cpp, no remote).
//! Shared object: `libsalomon_core.so`  |  `System.loadLibrary("salomon_core")`

mod jni;

use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use std::path::Path;

pub const VERSION: &str = "0.0.1-m-a0";
pub const STUB_TEXT: &str =
    "STUB: Salomon M-A0 ask stub — no on-device model. Local inference not linked.";

/// Ask status for Rust + C/JNI ABI (`#[repr(C)]` / JSON string form).
#[repr(C)]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AskStatus {
    MissingModel = 0,
    Stub = 1,
    Local = 2,
    Refused = 3,
}

impl AskStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            AskStatus::MissingModel => "MissingModel",
            AskStatus::Stub => "Stub",
            AskStatus::Local => "Local",
            AskStatus::Refused => "Refused",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AskResult {
    pub status: AskStatus,
    pub text: String,
    pub error: Option<String>,
}

/// Stub sanitizer trait — real port is later; M-A0 uses thin `looks_secret` only.
pub trait Sanitizer {
    fn sanitize(&self, input: &str) -> Result<String, String>;
}

pub struct NoopSanitizer;
impl Sanitizer for NoopSanitizer {
    fn sanitize(&self, input: &str) -> Result<String, String> {
        Ok(input.to_string())
    }
}

pub fn to_json(r: &AskResult) -> String {
    let err = match &r.error {
        Some(e) => format!("\"{}\"", json_escape(e)),
        None => "null".to_string(),
    };
    format!(
        "{{\"status\":\"{}\",\"text\":\"{}\",\"error\":{}}}",
        r.status.as_str(),
        json_escape(&r.text),
        err
    )
}

fn json_escape(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if c.is_control() => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out
}

/// Thin secret-shape gate (not full sanitizer).
pub fn looks_secret(s: &str) -> bool {
    if s.contains("PRIVATE KEY-----") {
        return true;
    }
    if s.contains("sk-") {
        if let Some(i) = s.find("sk-") {
            let rest = &s[i + 3..];
            let n = rest.chars().take_while(|c| c.is_ascii_alphanumeric() || *c == '_' || *c == '-').count();
            if n >= 20 {
                return true;
            }
        }
    }
    if let Some(i) = s.find("ed25519:") {
        let rest = &s[i + "ed25519:".len()..];
        let n = rest
            .chars()
            .take_while(|c| c.is_ascii_alphanumeric())
            .count();
        if n >= 32 {
            return true;
        }
    }
    // Whole-prompt seed phrase: 12/15/18/21/24 lowercase words, each 3–8 letters.
    let words: Vec<&str> = s.split_whitespace().collect();
    let n = words.len();
    if matches!(n, 12 | 15 | 18 | 21 | 24)
        && words
            .iter()
            .all(|w| (3..=8).contains(&w.len()) && w.chars().all(|c| c.is_ascii_lowercase()))
    {
        return true;
    }
    false
}

fn process_env(key: &str) -> Option<String> {
    std::env::var(key).ok()
}

/// Host/process-env ask.
pub fn ask(prompt: &str) -> AskResult {
    ask_with_env(prompt, process_env)
}

/// Testable ask with injected env lookup.
pub fn ask_with_env<F: Fn(&str) -> Option<String>>(prompt: &str, env: F) -> AskResult {
    if looks_secret(prompt) {
        return AskResult {
            status: AskStatus::Refused,
            text: String::new(),
            error: Some("secret_shaped_input".into()),
        };
    }
    if env("SALOMON_ASK_STUB").as_deref() == Some("1") {
        return AskResult {
            status: AskStatus::Stub,
            text: STUB_TEXT.into(),
            error: None,
        };
    }
    let Some(path) = env("SALOMON_GGUF") else {
        return AskResult {
            status: AskStatus::MissingModel,
            text: String::new(),
            error: Some("gguf_path_unset".into()),
        };
    };
    if path.contains("-of-") {
        return AskResult {
            status: AskStatus::MissingModel,
            text: String::new(),
            error: Some("gguf_shard_refused".into()),
        };
    }
    if !Path::new(&path).is_file() {
        return AskResult {
            status: AskStatus::MissingModel,
            text: String::new(),
            error: Some("gguf_not_found".into()),
        };
    }
    // File present but M-A0 has no llama.cpp runner.
    AskResult {
        status: AskStatus::MissingModel,
        text: String::new(),
        error: Some("runner_not_linked".into()),
    }
}

// —— C ABI (Release cargo-ndk / Frontend JSON facade) ——

#[no_mangle]
pub extern "C" fn salomon_version() -> *const c_char {
    static V: &[u8] = b"0.0.1-m-a0\0";
    V.as_ptr() as *const c_char
}

/// Returns heap JSON `{"status","text","error"}`. Caller must `salomon_free_string`.
#[no_mangle]
pub unsafe extern "C" fn salomon_ask(prompt: *const c_char) -> *mut c_char {
    let result = if prompt.is_null() {
        AskResult {
            status: AskStatus::Refused,
            text: String::new(),
            error: Some("null_prompt".into()),
        }
    } else {
        match CStr::from_ptr(prompt).to_str() {
            Ok(s) => ask(s),
            Err(_) => AskResult {
                status: AskStatus::Refused,
                text: String::new(),
                error: Some("invalid_utf8_prompt".into()),
            },
        }
    };
    match CString::new(to_json(&result)) {
        Ok(c) => c.into_raw(),
        Err(_) => CString::new("{\"status\":\"Refused\",\"text\":\"\",\"error\":\"json_nul\"}")
            .unwrap()
            .into_raw(),
    }
}

#[no_mangle]
pub unsafe extern "C" fn salomon_free_string(ptr: *mut c_char) {
    if ptr.is_null() {
        return;
    }
    drop(CString::from_raw(ptr));
}
