#!/usr/bin/env python3
"""Shared secret heuristics (BIP39-like runs, PEM, long hex, API keys, base64 blobs).
Used by prepare_domain_data.py (preflight, fail closed) and local_inference.py (runtime scrub).
Heuristic by design: false positives are preferred over leaking a secret."""
import re

# Common English words that never appear in the BIP39 list; a real mnemonic has ~none.
_STOP = set("the and of to is in for that with you it are be as on by or an this from at not".split())
_WORD_RUN = re.compile(r"(?:\b[a-z]{3,8}\b[ \t,\-]+){11,}\b[a-z]{3,8}\b")
PATTERNS = [
    ("pem_private_key", re.compile(r"-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----")),
    ("hex_key_64+", re.compile(r"(?<![0-9a-fA-F])(?:0x)?[0-9a-fA-F]{64,}(?![0-9a-fA-F])")),
    ("near_ed25519_secret", re.compile(r"ed25519:[1-9A-HJ-NP-Za-km-z]{80,}")),
    ("api_key_sk", re.compile(r"\bsk-[A-Za-z0-9_\-]{16,}")),
    ("api_key_assignment", re.compile(r"(?i)\bapi[_-]?key\b\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{12,}")),
    ("base64_blob", re.compile(r"(?<![A-Za-z0-9+/])[A-Za-z0-9+/]{60,}={0,2}(?![A-Za-z0-9+/=])")),
]

def _bip39_like(text):
    for m in _WORD_RUN.finditer(text):
        words = re.findall(r"[a-z]+", m.group(0))
        for i in range(len(words) - 11):  # 12-word windows with <=1 common stopword
            if sum(x in _STOP for x in words[i:i+12]) <= 1:
                return True
    return False

def scan_text(text):
    """Return list of reason strings (empty = clean)."""
    text = text if isinstance(text, str) else str(text)
    reasons = [name for name, rx in PATTERNS if rx.search(text)]
    if _bip39_like(text):
        reasons.append("bip39_like_12+_word_run")
    return reasons

def scan_record(rec):
    """Scan all message contents + tags. Returns list of (field, reason)."""
    if not isinstance(rec, dict):
        return [("record", r) for r in scan_text(rec)]
    hits = []
    for i, msg in enumerate(rec.get("messages", [])):
        for r in scan_text(msg.get("content", "")):
            hits.append((f"messages[{i}].content", r))
    for r in scan_text(" ".join(map(str, rec.get("tags", [])))):
        hits.append(("tags", r))
    return hits

SAFETY_MSG = ("[local guard] That looks like a seed phrase or private key. It was NOT sent to the model "
              "and is not stored in chat history. Treat it as compromised: create a new wallet on a trusted "
              "device and move your funds now. Never paste seeds/keys into any chat.")
