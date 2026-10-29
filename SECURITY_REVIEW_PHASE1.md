# Security Review — Phase 1 scaffold
**Reviewer:** Privacy Security  
**Date:** Wed Oct 28, 2026 (America/Vancouver)  
**Scope:** `/workspace/near-privacy-ai` docs + `phase1-slm` scripts/data  
**Verdict:** Principles in ARCHITECTURE are sound. Implementation lags them. Highest risk is **ordering**: remote inference + agent tools (Phase 2) are scheduled before sanitizer, policy engine, and a real threat model (Phase 4).

## What's good
- Explicit non-goals: model never holds raw keys; proposal → validate → simulate → policy → signer.
- Local-first inference CLI; `report_to=[]` on Trainer (no default Weights & Biases leak).
- Seed/eval include seed-paste handling, TEE trust limits, function-call keys, one laundering refusal.
- System prompt refuses keys / laundering / theft framing.

## Findings (priority order)

### P0 — Pull privacy controls forward of Phase 2
Roadmap puts prompt sanitizer, policy engine, and threat-model docs in Phase 4, after NEAR AI Cloud remote calls and tool loops. **Do not ship attestation-gated remote prompts or any write-capable tool without:** (1) attestation verify before first byte of prompt leaves the box, (2) local sanitizer/redactor hook, (3) policy + spend limits on the signer path. Propose: split a **Phase 1.5 / 2.0 gate** that blocks Phase 2 merge until those stubs exist and are tested.

### P0 — Attestation is aspirational (A1 unverified)
ARCHITECTURE A1 admits TEE attestation routes are not encoded. Phase 2 item "NEAR AI Cloud private inference backend with attestation check" will become "trust the URL" unless someone owns verify-before-send with fail-closed behavior. **Owner needed now**, not Phase 4.

### P1 — Eval harness claims safety checks it does not run
`eval_harness.py` docstring: "refusal/safety check". Code only does keyword rubric. Seed-paste / launder / injection prompts can score high on keywords while still echoing secrets or complying. Add explicit refusal scoring (must-refuse / must-not-echo) and fail the run on violations.

### P1 — No secret/PII gate on training data
`prepare_domain_data.py` loads `data/extra/*.jsonl` with zero schema or content checks. README says "don't include real addresses" — that is hope, not control. Add a preflight that rejects BIP39-looking strings, PEM/hex keys, and high-entropy secrets before write/train.

### P1 — No `.gitignore`
`.venv/` already exists under `phase1-slm/`. `outputs/` (adapters, eval JSONL with full prompts/answers) will appear next. Without ignore rules, the first accidental `git add` leaks eval dumps and local env.

### P2 — Local inference soft privacy
- First run hits Hugging Face by default; `HF_HUB_OFFLINE=1` is documented, not enforced or warned.
- `--no-system` strips the safety system prompt with no compensating control.
- Interactive history is unbounded in-process; a pasted seed sits in `hist` until process exit (no scrub).
- No local detector that refuses to *continue* after a seed/key paste (training teaches the right answer; runtime does not enforce it).

### P2 — Thin adversarial / compliance coverage
Only one laundering refusal and one seed-paste example in seed; eval has seed-paste keywords but no injection-via-tool-output / fake-system / "ignore policy" cases. Phase 2 will ingest untrusted chain metadata — start that eval set now.

### P2 — Assumptions A2–A6 still open
Agent Market, Intents, Chain Signatures IDs, IronClaw — fine for Phase 1, but Chain Signatures + Intents are the future signing/execution surface. Treat unverified contract IDs as **untrusted until pinned**; do not bake placeholders into signer code.

## Required before Phase 2 code merges
1. Written threat model (assets, trust boundaries, STRIDE-ish on local SLM / remote TEE / agent tools / signer).
2. Attestation client: fail-closed; log attestation digest, never log prompt.
3. Sanitizer stub: strip/redact addresses, seeds, keys; unit tests.
4. Policy engine stub: allowlist + per-tx/daily caps + "human above threshold"; no path from model text → sign.
5. Eval: refusal suite + "must not echo secret" assertions; harness fails CI on miss.
6. `.gitignore` for `.venv/`, `outputs/`, HF caches, `.env*`.

## Out of scope this pass
- Running models / installing deps
- Live NEAR AI Cloud API probe (needs network + product decision)
- Contract code (Phase 3 not started)

## Ask for Lead Architect
Confirm: (a) pull Phase 4 privacy items into a Phase 2 gate, (b) who owns attestation verify, (c) whether Privacy Security reviews every Phase 2 PR that touches tools, remote inference, or keys.
