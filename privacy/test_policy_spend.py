"""Run: python privacy/test_policy_spend.py"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from privacy import policy_spend as ps
from privacy.policy_spend import PolicyConfig, TxProposal, check_proposal as chk
N = 10**24
CFG = PolicyConfig(frozenset({"app.testnet"}), frozenset({"ft_transfer"}), 2*N, 3*N, 3, 3600)
P = lambda r="app.testnet", m="ft_transfer", d=N: TxProposal(r, m, d, "user.testnet")

def t_allow():
    ps.reset_state(); r = chk(P(), CFG, 0); assert r.decision == "allow" and not r.requires_human
def t_deny_receiver():
    ps.reset_state(); assert chk(P(r="evil.testnet"), CFG, 0).decision == "deny"
def t_deny_method():
    ps.reset_state(); assert chk(P(m="add_full_access_key"), CFG, 0).decision == "deny"
def t_over_tx_cap():
    ps.reset_state(); r = chk(P(d=5*N), CFG, 0); assert r.decision == "needs_human" and r.requires_human
def t_daily_cap():
    ps.reset_state(); chk(P(d=2*N), CFG, 0); r = chk(P(d=2*N), CFG, 1)
    assert r.decision == "needs_human" and "over_daily_cap" in r.reasons
def t_daily_reset_next_day():
    ps.reset_state(); chk(P(d=2*N), CFG, 0); assert chk(P(d=2*N), CFG, 86400 + 1).decision == "allow"
def t_rate_limit():
    ps.reset_state(); [chk(P(d=1), CFG, i) for i in range(3)]; assert chk(P(d=1), CFG, 4).reasons == ["rate_limited"]
def t_malformed():
    ps.reset_state()
    for bad in (None, {"receiver": "app.testnet"}, P(d=-1), P(d="1"), P(d=1.0), P(r=""), P(d=True)):
        assert chk(bad, CFG, 0).decision == "deny", bad
def t_default_deny_empty_config():
    ps.reset_state(); assert chk(P(), PolicyConfig(), 0).decision == "deny"
def t_log_no_secrets():
    ps.reset_state(); log = chk(P(), CFG, 0).log; assert set(log) <= {"decision","reasons","receiver","method","deposit_yocto"}
def t_cannot_sign():
    src = open(ps.__file__).read().split('"""', 2)[2]; assert "sign(" not in src and "import requests" not in src and "socket" not in src

if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("t_")]
    for f in tests: f(); print("PASS", f.__name__)
    print(f"{len(tests)}/{len(tests)} policy_spend tests passed")
