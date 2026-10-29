# Threat Model — Phase 1 SLM pipeline
**Date:** Wed Oct 28, 2026 (America/Vancouver)  
**Assets:** domain dataset, QLoRA adapter weights, eval artifacts, system prompt / safety behavior, developer machine secrets (HF tokens, future keys).  
**Trust boundary:** developer workstation. No remote inference, no chain signer, no agent tools in Phase 1.

## Data flow
1. `prepare_domain_data.py` → `data/seed_prompts.jsonl` (+ optional `data/extra/*.jsonl`)
2. `finetune_qlora.py` loads base weights (HF hub or cache) + JSONL → writes `outputs/*` adapter
3. `local_inference.py` / `eval_harness.py` load base (+ optional adapter) → stdout / `outputs/eval_results.jsonl`

## Threats & mitigations

| ID | Threat | Impact | Phase 1 status | Mitigation |
|----|--------|--------|----------------|------------|
| T1 | Secrets/PII in training or extra JSONL | Keys/addresses memorized into adapter; leak via generation or shared weights | **Open** — README warning only | Preflight reject BIP39-like, PEM, long hex keys; refuse train on fail |
| T2 | Eval/adapter committed to git | Prompt/answer dumps and weights published | **Partially closed** — `phase1-slm/.gitignore` added; confirm before first commit | Keep ignore; never force-add `outputs/` |
| T3 | Cloud training telemetry (W&B etc.) | Prompt text leaves machine | **Closed** for default — `report_to=[]` | Keep default; require explicit review to enable |
| T4 | HF hub fetch on first run | Network exfil path / supply-chain swap of base model | **Open** — offline documented, not enforced | Pin revision hashes; warn or require `HF_HUB_OFFLINE=1` after cache; verify checksum when pinning |
| T5 | User pastes seed into local chat | Seed sits in process memory/history; may appear in accidental logs | **Open** — behavior taught in data, not enforced in CLI | Runtime detect + refuse continue; scrub hist; never write paste to disk |
| T6 | `--no-system` removes safety framing | Weaker refusals in smoke/chat | **Open** | Ban flag in user-facing entrypoints; keep for controlled ablations only |
| T7 | Eval “safety” is keyword-only | False confidence; model echoes secrets or complies with launder asks | **Open** — docstring overclaims | Must-refuse / must-not-echo assertions; CI fail |
| T8 | Poisoned `data/extra` (prompt injection / exfil instructions in assistant turns) | Adapter learns to dump context or bypass refusals | **Open** — no schema/content review | Human review checklist + schema validate before merge |
| T9 | Base model / peft supply chain | Malicious wheel or weight | Standard OSS risk | Pin versions in requirements; prefer hash-pinning when locking |

## Non-goals this phase
Remote TEE attestation, spend limits, Chain Signatures, Agent Market, prompt sanitizer productization — covered as **stubs in SECURITY.md**; must exist before Phase 2 remote/tools merge.

## Residual risk acceptable for Phase 1
Local-only experimentation with synthetic seed data on a trusted workstation, adapters not published, no production user traffic.
