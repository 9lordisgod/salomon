# Threat Model Stub — Phase 1.5 (Privacy merge gate)
**Status:** stub for gate acceptance. Expand before Phase 2 merge.  
**Date:** Wed Oct 28, 2026 (America/Vancouver)  
**Owner:** Privacy Security (acceptance). Implementers: Agent Engineer (attestation), SLM Engineer (refusal eval), TBD (sanitizer + policy stubs).

## Assets
| Asset | Why it matters |
|-------|----------------|
| User prompts / completions | Financial intent, addresses, strategies; subpoena/breach surface if remote |
| Attestation evidence (quotes, measurements, digests) | Proves *which* code/config; forgeable if unchecked |
| Sanitizer rules + redaction logs | Wrong rules → silent leak or broken UX |
| Policy allowlists, spend caps, approval thresholds | Bypass = unauthorized spend |
| Function-call / constrained signer keys | Leak = limited but real damage |
| Tool I/O (RPC, explorers) | Injection via memos, token names, metadata |
| Refusal eval suite + CI gate | False green = ship unsafe model behavior |

## Trust boundaries
```
[User / local CLI] 
    --prompt--> [Local SLM] --optional--> [Sanitizer] --if remote--> [Attestation verify]
                                                                    | fail-closed
                                                                    v
                                                         [NEAR AI Cloud TEE]
[Agent loop] --tool calls--> [Read-only RPC]  (untrusted responses)
[Agent loop] --tx proposal--> [Schema+Sim] --> [Policy/spend] --> [Human if over cap] --> [Signer]
                                                                     ^
                                                     model never crosses this line with key material
```

| Boundary | Trust | Rule |
|----------|-------|------|
| Local process ↔ disk (`outputs/`, datasets) | Developer machine | No secrets in git; preflight data; gitignore outputs |
| Local ↔ Hugging Face / package registries | Supply chain | Pin versions; offline after cache |
| Local ↔ NEAR AI Cloud | Untrusted until attestation passes | Verify report + allowlisted measurements; log digest never prompt |
| Model ↔ Signer | Hard isolation | No raw keys in model/context; policy sits between |
| Agent ↔ Chain/RPC data | Untrusted input | Wrap tool output; never execute as instructions |
| CI ↔ Eval suite | Gate | Refusal/must-not-echo failures block merge |

## Phase 1.5 exit criteria (all required)
1. This threat model filled out for any new asset/boundary introduced by Phase 2 PRs.
2. Attestation client fail-closed; Privacy Security sign-off on acceptance criteria.
3. Sanitizer stub + unit tests (addresses, seeds/BIP39-like, PEM/hex keys).
4. Policy/spend stub (allowlist + per-tx/daily cap + over-cap requires human) — no model→sign path.
5. Refusal / must-not-echo suite green in CI (see `REFUSAL_EVAL_CRITERIA.md`).

## Deferred (not blocking 1.5 stub, blocking production)
Full STRIDE per component, IronClaw detail, unlinkable payments, production logging policy.
