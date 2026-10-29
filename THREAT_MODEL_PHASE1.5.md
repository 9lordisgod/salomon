# Threat Model — Phase 1.5 (Privacy merge gate)
**Status:** filled for Phase 1.5 gate (re-review on every Phase 2 PR adding an asset/boundary).  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Owner:** Privacy Security (acceptance). Implementers: Agent Engineer (attestation), SLM Engineer (refusal eval), Privacy Security (sanitizer + policy stubs in `privacy/`).

## Assets
| Asset | Why it matters | C | I | A |
|-------|----------------|---|---|---|
| User prompts / completions | Financial intent, addresses, strategies; subpoena/breach surface if remote | HIGH: never logged; remote only post-attestation + sanitizer | Med: tampered completion → bad proposal (policy catches spend) | Low: local fallback = refuse, not unattested remote |
| Attestation evidence (quotes, measurements, digests) | Proves *which* code/config; forgeable if unchecked | Low (public-ish) | HIGH: forged/skipped = all remote guarantees void | Med: unavailable → no remote (fail-closed) |
| Measurement allowlist | Defines "trusted image" | Low | HIGH: stale/broad entry = wrong image "attested" | Med |
| Sanitizer rules + redaction logs | Wrong rules → silent leak or broken UX | Logs: kinds/counts only, never matched text | HIGH: false negative leaks seed/address | Med: false-positive DoS |
| Policy allowlists, spend caps, approval thresholds | Bypass = unauthorized spend | Low | HIGH | Med: misconfig → all-deny (acceptable) |
| Daily spend / rate counters | Enforce caps across txs | Low | HIGH: reset/race = cap bypass | Low |
| Function-call / constrained signer keys | Leak = limited but real damage | CRITICAL: never in model/context/logs | HIGH | Med |
| Tool I/O (RPC, explorers) | Injection via memos, token names, metadata | Low | HIGH: treated as data only | Low |
| Refusal eval suite + CI gate | False green = ship unsafe model behavior | Low | HIGH | Low |

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
| Local SLM ↔ Sanitizer | Sanitizer is last local check | `privacy/sanitizer.py`: secrets → reject in every mode; addresses → typed placeholders; errors → reject |
| Policy ↔ Signer | Hard gate | Only `propose_tx → schema → simulate → policy.check → human(if needs_human) → signer`; deny on parse failure; stub cannot sign |
| Allowlist files ↔ runtime | Reviewed config | Measurements + receiver/method allowlists changed only via Privacy Security review |

Additional rules: no silent fallback (remote failure → user-visible refusal, never unattested remote or "local pretending remote"); logs carry digests/ids/decisions only.

## STRIDE-style threats
| ID | STRIDE | Threat | Impact | Mitigation required for 1.5 gate | Residual risk |
|----|--------|--------|--------|----------------------------------|---------------|
| P15-T1 | S/T | Attestation forged, skipped, or silent fallback to unattested remote | Prompts to unverified host | Fail-closed matrix + tests per `ATTESTATION_ACCEPTANCE.md`; no fallback code path | TEE/vendor compromise; attestation ≠ code is good |
| P15-T2 | I | Prompt/completion logged on remote client path | Breach/subpoena surface | Digest-only log schema; test asserts no prompt text in logs | Provider-side logs outside our control |
| P15-T3 | I | Sanitizer false negative (seed/key/address reaches remote) | Fund loss / deanonymization | `privacy/sanitizer.py` secrets reject; 17 unit tests; heuristics shared with phase1 preflight (parity test) | Novel encodings (split seeds, non-English BIP39, obfuscated hex); prefixed 64-hex key read as implicit account |
| P15-T4 | D | Sanitizer false positive DoS | Remote unusable for benign text | Accept for 1.5 (fail-closed preferred); reasons returned so UX can explain | Base64/word-run FPs on long prose |
| P15-T5 | E | Policy bypass / model→sign shortcut | Unauthorized spend | Single pipeline; stub has no signing import; deny on malformed; review per `POLICY_SPEND_ACCEPTANCE.md` | Future signer integration must re-prove isolation |
| P15-T6 | E | Cap misconfig / allowlist too broad (wildcards, `add_full_access_key`) | Large/unbounded spend | Default-deny empty config; exact-match allowlists; caps in yocto ints | Human approver fatigue |
| P15-T7 | T/E | Tool/RPC memo injection into agent | Agent proposes attacker tx / echoes attack | Tool output wrapped as data; policy gate; **R3 near-echo tighten = pre-Phase-2 blocker** (item 5 not reopened) | Paraphrase echoes beyond substring checks |
| P15-T8 | S | Measurement allowlist stale / wrong image still "attested" | Trust in superseded/vulnerable image | Pinned, reviewed allowlist; change requires Privacy Security review | Lag between vendor advisory and allowlist update |
| P15-T9 | T/E | Spend stub race / daily counter reset abuse (restart resets in-memory counter, concurrent checks) | Cap bypass | Stub documents non-durable counter; production requires durable, atomic counter + test | Stub alone is not safe for real funds |

## Phase 1.5 exit criteria (all required)
1. This threat model filled out for any new asset/boundary introduced by Phase 2 PRs.
2. Attestation client fail-closed; Privacy Security sign-off on acceptance criteria.
3. Sanitizer stub + unit tests (addresses, seeds/BIP39-like, PEM/hex keys).
4. Policy/spend stub (allowlist + per-tx/daily cap + over-cap requires human) — no model→sign path.
5. Refusal / must-not-echo suite green in CI (see `REFUSAL_EVAL_CRITERIA.md`). — **SIGNED OFF** (`SECURITY_SIGNOFF_REFUSAL_7B.md`). Residual R3 near-echo = pre-Phase-2 blocker, not a reopen.

Status Thu Oct 29 2026: (1) filled; (3) stub + tests landed; (4) criteria + non-signing stub + tests landed (sign-off pending review); (2) acceptance criteria in `ATTESTATION_ACCEPTANCE.md`, client pending (Agent Engineer). **Gate OPEN. No Phase 2.**

## Out of scope / deferred (blocking production, not 1.5)
Full IronClaw design, unlinkable payments, production logging/retention policy, durable spend counters, per-component STRIDE for Phase 3 (Chain Sigs/Intents).
