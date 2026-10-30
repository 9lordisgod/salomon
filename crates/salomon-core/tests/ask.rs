use salomon_core::*;
use std::collections::HashMap;

fn env(pairs: &[(&str, &str)]) -> impl Fn(&str) -> Option<String> {
    let m: HashMap<String, String> = pairs.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect();
    move |k| m.get(k).cloned()
}

#[test]
fn missing_model_when_unset() {
    let r = ask_with_env("hello", env(&[]));
    assert_eq!(r.status, AskStatus::MissingModel);
    assert_eq!(r.error.as_deref(), Some("gguf_path_unset"));
}

#[test]
fn missing_model_when_file_absent() {
    let r = ask_with_env("hi", env(&[("SALOMON_GGUF", "/nonexistent/x.gguf")]));
    assert_eq!(r.error.as_deref(), Some("gguf_not_found"));
}

#[test]
fn existing_file_is_runner_not_linked() {
    let p = std::env::temp_dir().join("salomon-test-model.gguf");
    std::fs::write(&p, b"x").unwrap();
    let r = ask_with_env("hi", env(&[("SALOMON_GGUF", p.to_str().unwrap())]));
    assert_eq!(r.status, AskStatus::MissingModel);
    assert_eq!(r.error.as_deref(), Some("runner_not_linked"));
}

#[test]
fn shard_refused() {
    let r = ask_with_env("hi", env(&[("SALOMON_GGUF", "/m/model-00001-of-00002.gguf")]));
    assert_eq!(r.status, AskStatus::MissingModel);
    assert_eq!(r.error.as_deref(), Some("gguf_shard_refused"));
}

#[test]
fn stub_mode() {
    let r = ask_with_env("hi", env(&[("SALOMON_ASK_STUB", "1")]));
    assert_eq!(r.status, AskStatus::Stub);
    assert_eq!(r.text, STUB_TEXT);
}

#[test]
fn secrets_refused_even_in_stub() {
    let e = [("SALOMON_ASK_STUB", "1")];
    for s in [
        "-----BEGIN OPENSSH PRIVATE KEY-----\nabc",
        "my key sk-abcdefghijklmnopqrstuvwxyz123",
        "ed25519:3JqkPq7Lz1b2c3d4e5f6g7h8i9j0kLmNoPqRsTuV",
        "abandon ability able about above absent absorb abstract absurd abuse access accident",
    ] {
        assert_eq!(ask_with_env(s, env(&e)).status, AskStatus::Refused, "{s}");
    }
}

#[test]
fn normal_prose_not_refused() {
    let r = ask_with_env("what is the task-list for today", env(&[("SALOMON_ASK_STUB", "1")]));
    assert_eq!(r.status, AskStatus::Stub);
}

#[test]
fn c_abi_roundtrip() {
    use std::ffi::{CStr, CString};
    let p = CString::new("hello").unwrap();
    unsafe {
        let out = salomon_ask(p.as_ptr());
        let s = CStr::from_ptr(out).to_str().unwrap().to_string();
        salomon_free_string(out);
        assert!(s.starts_with("{\"status\":"));
        assert!(CStr::from_ptr(salomon_version()).to_str().unwrap().ends_with("-m-a0"));
    }
}
