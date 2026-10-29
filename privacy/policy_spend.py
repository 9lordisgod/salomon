"""Policy/spend stub (Phase 1.5 item 4). CANNOT SIGN: no key handling, no signer import, no network.
Pipeline: propose_tx -> schema validate -> simulate (stub) -> check_proposal -> human if needs_human -> signer (out of scope).
Daily counter + rate limit are IN-MEMORY ONLY (reset on restart = not durable; production needs durable store)."""
import time
from dataclasses import dataclass, field

ALLOW, DENY, NEEDS_HUMAN = "allow", "deny", "needs_human"

@dataclass
class PolicyConfig:
    receiver_allowlist: frozenset = frozenset()
    method_allowlist: frozenset = frozenset()
    per_tx_cap_yocto: int = 0
    daily_cap_yocto: int = 0
    rate_limit_n: int = 5
    rate_window_s: int = 3600

@dataclass
class TxProposal:
    receiver: str
    method: str
    deposit_yocto: int
    signer_id: str

@dataclass
class PolicyDecision:
    decision: str
    reasons: list
    requires_human: bool = False
    log: dict = field(default_factory=dict)  # decision + ids only; never keys/prompts

class _State:
    def __init__(self): self.day, self.spent, self.times = None, 0, []
_STATE = _State()

def reset_state():
    global _STATE; _STATE = _State()

def _d(decision, reasons, p=None):
    log = {"decision": decision, "reasons": list(reasons)}
    if isinstance(p, TxProposal):
        log.update(receiver=p.receiver, method=p.method, deposit_yocto=p.deposit_yocto)
    return PolicyDecision(decision, list(reasons), decision == NEEDS_HUMAN, log)

def check_proposal(p, config, now=None):
    try:
        if not isinstance(config, PolicyConfig): return _d(DENY, ["bad_config"])
        if not isinstance(p, TxProposal): return _d(DENY, ["malformed:not_proposal"])
        for f in ("receiver", "method", "signer_id"):
            if not isinstance(getattr(p, f), str) or not getattr(p, f): return _d(DENY, [f"malformed:{f}"], p)
        if type(p.deposit_yocto) is not int or p.deposit_yocto < 0: return _d(DENY, ["malformed:deposit_yocto"], p)
        if p.receiver not in config.receiver_allowlist: return _d(DENY, ["receiver_not_allowlisted"], p)
        if p.method not in config.method_allowlist: return _d(DENY, ["method_not_allowlisted"], p)
        now = time.time() if now is None else now
        st, day = _STATE, int(now // 86400)
        if st.day != day: st.day, st.spent = day, 0
        st.times = [t for t in st.times if now - t < config.rate_window_s]
        if len(st.times) >= config.rate_limit_n: return _d(DENY, ["rate_limited"], p)
        reasons = []
        if p.deposit_yocto > config.per_tx_cap_yocto: reasons.append("over_per_tx_cap")
        if st.spent + p.deposit_yocto > config.daily_cap_yocto: reasons.append("over_daily_cap")
        if reasons: return _d(NEEDS_HUMAN, reasons, p)  # never auto-sign; human approval does not update counter here
        st.spent += p.deposit_yocto; st.times.append(now)
        return _d(ALLOW, ["within_policy"], p)
    except Exception as e:
        return _d(DENY, [f"internal_error:{type(e).__name__}"])
