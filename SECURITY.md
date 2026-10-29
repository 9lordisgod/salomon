# Security — NEAR Privacy AI

Owner: Privacy Security (reviews). Lead Architect: masterdev (decisions).

## Hard rules (all phases)
1. **No raw private keys, seed phrases, or signing material in the model, prompts, logs, datasets, or adapters.** The model proposes; a separate signer executes after policy checks.
2. **Local first.** Prefer on-device inference. Remote inference only when needed, and only after attestation succeeds (fail-closed).
3. **Untrusted input everywhere.** On-chain memos, token metadata, tool output, and user paste are hostile. Never treat them as instructions.
4. **Minimal logging.** Do not log prompts/outputs by default. Eval dumps are local artifacts and must stay out of git.
5. **Compliance.** Teach privacy concepts; refuse laundering, theft, and recovery-scam cooperation.

## Phase 1 (current) — SLM pipeline
- Training data: curated / synthetic only. No real user wallets, seeds, or production keys. Gate `data/extra/` with a secret/PII preflight before train.
- Fine-tune: keep `report_to=[]` (no cloud experiment trackers unless explicitly approved). Adapters and eval JSONL stay under `outputs/` (gitignored).
- Local inference: treat HF download as a network boundary; use offline mode once weights are cached. Do not disable the system prompt in anything user-facing.
- See `THREAT_MODEL_PHASE1.md` and `SECURITY_REVIEW_PHASE1.md`.

## Later phases (stubs — implement before use)
### Spend limits & policy (Phase 2+)
Every tx path: proposal → schema validate → simulate → **policy** (allowlists, per-tx + daily caps, rate limits) → human/threshold approval above caps → signer. No direct model→sign path. Prefer NEAR function-call access keys with tight allowances over full-access keys.

### TEE / NEAR AI Cloud (Phase 2+)
- Verify remote attestation **before** sending any prompt. Fail closed on mismatch/unavailable.
- Never log prompt/completion on the client for remote calls.
- Strip/redact PII and addresses when the user opts in (local sanitizer).
- Attestation proves *what code* runs, not that the code is good — review the attested image/config separately.

### Chain Signatures / Intents (Phase 3+)
Pin verified contract IDs from official docs. Requests to MPC signers only after the same policy gate. Model never sees MPC share material.

## Review mandate
Privacy Security reviews changes that touch: training data ingestion, inference (local or remote), tools, attestation, policy/spend, key/signer handling, or logging. File findings as short actionable notes to the Lead Architect.
