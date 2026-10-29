"""Local sanitizer stub (Phase 1.5 item 3). Runs BEFORE any remote call. No network.
Rules: secrets never leave for remote (reject in every mode); addresses redact (or reject in mode=reject).
Any internal error -> ok=False (fail-closed)."""
import re
from dataclasses import dataclass, field
from .secret_heuristics import scan_text

# Implicit account: exactly 64 lowercase hex, only when preceded by address context (otherwise treated as a key).
IMPLICIT_RX = re.compile(r"(?i)\b(?:account|receiver|recipient|implicit|address|to)\b[\s:=]*(?<![0-9a-f])([0-9a-f]{64})(?![0-9a-fA-F])")
NAMED_RX = re.compile(r"(?<![\w.-])(?:[a-z0-9_-]+\.)*[a-z0-9_-]+\.(?:near|testnet)\b")
EVM_RX = re.compile(r"(?<![0-9a-fA-Fx])0x[0-9a-fA-F]{40}(?![0-9a-fA-F])")
ADDRESS_RULES = [("near_implicit_account", IMPLICIT_RX, "[NEAR_IMPLICIT]"),
                 ("near_named_account", NAMED_RX, "[NEAR_ACCOUNT]"),
                 ("evm_address", EVM_RX, "[EVM_ADDRESS]")]

@dataclass
class SanitizerConfig:
    strip_addresses: bool = True
    strip_secrets: bool = True   # cannot be disabled for remote: False is treated as True
    mode: str = "redact"         # redact | reject

@dataclass
class SanitizeResult:
    ok: bool
    text: str
    redactions: list = field(default_factory=list)
    reasons: list = field(default_factory=list)

def _reject(reasons, redactions=()):
    return SanitizeResult(False, "", list(redactions), reasons)

def sanitize_for_remote(text, config=None):
    try:
        config = config or SanitizerConfig()
        if config.mode not in ("redact", "reject"):
            return _reject([f"bad_mode:{config.mode}"])
        if not isinstance(text, str):
            return _reject(["non_string_input"])
        redactions, out = [], text
        if config.strip_addresses:
            for kind, rx, ph in ADDRESS_RULES:
                def sub(m, kind=kind, ph=ph):
                    g = 1 if m.groups() else 0
                    redactions.append({"kind": kind, "span": m.span(g), "placeholder": ph})
                    return m.group(0)[:m.start(g) - m.start(0)] + ph
                out = rx.sub(sub, out)
        # Secret scan runs on the address-redacted text (so implicit accounts in context don't trip hex_key).
        secrets = scan_text(out)
        if secrets:  # secret wins, every mode
            return _reject([f"secret:{r}" for r in secrets], redactions)
        if redactions and config.mode == "reject":
            return _reject(["address_present_mode_reject"], redactions)
        return SanitizeResult(True, out, redactions, [])
    except Exception as e:  # fail-closed
        return _reject([f"internal_error:{type(e).__name__}"])
