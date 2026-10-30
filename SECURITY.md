# Security — Salomon

Local-first research agent for investigative journalists, private investigators, and researchers handling sensitive sources and documents. Android app not shipped; source-ID masking (M2) and export approval UX (M3) not shipped. 

## Hard rules (all phases)
1. **No secrets in the model.** No private keys, seed phrases, API keys, passwords, or signing material in weights, prompts, logs, datasets, or adapters. The model *proposes*; anything privileged runs outside it, behind policy.
2. **Local first.** On-device inference is the default. Remote inference is opt-in and only to a **verified-remote** endpoint (attested / allowlisted confidential compute), fail-closed.
3. **All input is untrusted.** Tool output, retrieved pages, file contents, and user paste are data, never instructions.
4. **Sanitize before anything leaves the device.** Secrets are rejected; identifiers are redacted or rejected per mode.
5. **Minimal logging.** No prompt/output logging by default. Eval dumps are local artifacts, gitignored.
6. **Refuse harm.** Teach privacy concepts; refuse fraud, doxxing, theft, credential harvesting, and source exposure.

## Model (Phase 1) — small model that refuses to leak
- Training data: curated / synthetic only; `secret_scan.py` preflight fails closed on any hit (`data/extra/` included).
- Refusal gate: `eval_harness.py --require-refusal` (R1 harmful, R2 secret echo, R3 injection). Prior 7B 8/8 sign-off is **historical only — invalidated for product claims**; refusal not green until the privacy rebuild re-runs.
- No cloud trackers (`report_to=[]`). Offline inference (`--offline`) fails closed on cache miss. `--no-system` is ablation-only and env-gated.
- See `docs/threat-models/THREAT_MODEL_PHASE1.md`, `docs/reviews/SECURITY_REVIEW_PHASE1.md`.

## Agent runtime (Phase 2) — safe tools
- Sanitizer (`privacy/sanitizer.py`, TS parity `phase2/src/sanitize.ts`) runs before **every** remote completion, including `role:tool` messages.
- Tools are read-only and allowlisted; write/sign tool names are refused (`tool_not_permitted`). Results are wrapped as untrusted, size-capped, step-capped (default 8, hard 12).
- Verified-remote: allowlist miss ⇒ re-verify ×3 then DENY; measurement missing / bind fail ⇒ immediate DENY. New pins require a security review.
- Policy gate pattern (`privacy/policy_spend.py`): any future privileged action = proposal → schema validate → simulate → policy (allowlists, caps, rate limits) → human approval → executor. No model→execute path.

## Verified remote / confidential compute (optional, future)
- Verify attestation **before** sending any prompt; fail closed.
- Attestation proves *what code* runs, not that it is good — review the attested image/config separately.
- No client-side logging of remote prompts/completions.

## Gate artifacts (Phase 1.5 — (1)–(4) signed; (5) historical)
- Threat model: `docs/threat-models/THREAT_MODEL_PHASE1.5.md` (item 1).
- Attestation verify: `docs/acceptance/ATTESTATION_ACCEPTANCE.md`, `docs/signoffs/SECURITY_SIGNOFF_ATTESTATION_ITEM2.md` (item 2).
- Sanitizer 17/17 (item 3); policy stub 11/11, non-executing (item 4); refusal eval `docs/acceptance/REFUSAL_EVAL_CRITERIA.md` + `docs/signoffs/SECURITY_SIGNOFF_REFUSAL_7B.md` (item 5). Items 1/3/4: `docs/signoffs/SECURITY_SIGNOFF_PHASE1.5_1_3_4.md`.
- Run: `python3 privacy/test_sanitizer.py && python3 privacy/test_policy_spend.py`

## Review mandate
Any change touching training data, inference (local or remote), tools, attestation, policy, secret handling, or logging needs a security-focused review before merge.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report privately through **GitHub Security Advisories**: go to the repository's
**Security** tab → **Report a vulnerability** (private vulnerability reporting).
Include steps to reproduce, affected files/commits, and impact. We aim to
acknowledge reports within a few days.

Never include real secrets, keys, seed phrases, or source material in a report —
use obviously fake fixtures.
