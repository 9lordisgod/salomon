"""Run: python privacy/test_sanitizer.py  (synthetic fixtures only)"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from privacy.sanitizer import sanitize_for_remote as s, SanitizerConfig as C

BIP = "abandon ability able about above absent absorb abstract absurd abuse access accident"
PEM = "-----BEGIN PRIVATE KEY-----\nMIIfake\n-----END PRIVATE KEY-----"
HEX = "key " + "ab" * 32
IMPL = "c" * 64
EVM = "0x" + "1f" * 20

def t_clean():
    r = s("What is NEAR sharding?"); assert r.ok and r.text == "What is NEAR sharding?" and not r.redactions
def t_empty():
    r = s(""); assert r.ok and r.text == ""
def t_bip39():
    r = s("my words: " + BIP); assert not r.ok and r.text == "" and any("bip39" in x for x in r.reasons)
def t_pem():
    r = s(PEM); assert not r.ok and "secret:pem_private_key" in r.reasons
def t_hex():
    r = s(HEX); assert not r.ok and any("hex_key" in x for x in r.reasons)
def t_ed25519():
    r = s("ed25519:" + "5" * 88); assert not r.ok
def t_secret_redact_mode_still_rejects():
    r = s(PEM, C(mode="redact", strip_secrets=False)); assert not r.ok
def t_named():
    r = s("send 1 NEAR to alice.near and bob.testnet")
    assert r.ok and "alice.near" not in r.text and r.text.count("[NEAR_ACCOUNT]") == 2
def t_evm():
    r = s("bridge to " + EVM); assert r.ok and EVM not in r.text and "[EVM_ADDRESS]" in r.text
def t_implicit():
    r = s("receiver: " + IMPL); assert r.ok and IMPL not in r.text and "[NEAR_IMPLICIT]" in r.text
def t_bare_64hex_is_secret():
    r = s(IMPL); assert not r.ok
def t_secret_wins():
    r = s("pay alice.near " + EVM + " " + BIP); assert not r.ok and r.text == ""
def t_reject_mode_address():
    r = s("hi alice.near", C(mode="reject")); assert not r.ok and "address_present_mode_reject" in r.reasons
def t_no_strip():
    r = s("hi alice.near", C(strip_addresses=False)); assert r.ok and "alice.near" in r.text
def t_bad_mode():
    assert not s("x", C(mode="yolo")).ok
def t_non_str():
    assert not s(None).ok
def t_heuristic_parity():
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phase1-slm", "scripts"))
    import secret_scan; from privacy import secret_heuristics as h
    assert [(n, r.pattern) for n, r in secret_scan.PATTERNS] == [(n, r.pattern) for n, r in h.PATTERNS]

if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("t_")]
    for f in tests: f(); print("PASS", f.__name__)
    print(f"{len(tests)}/{len(tests)} sanitizer tests passed")
