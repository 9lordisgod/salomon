# Architecture — Salomon (privacy-first personal / agent AI)

> Reframed 2026-10-29 (Lead pivot): AI-first, local-first. Prior crypto/on-chain integration is archived — see the end of this file.

## Diagram
```mermaid
flowchart LR
  U[User] --> S[Sanitizer<br/>local]
  S --> M[Small model core<br/>Qwen2.5-7B + QLoRA]
  M --> A[Agent loop<br/>hard step/tool caps]
  A --> T[Tools<br/>read-only first]
  T -->|untrusted output| S
  A --> P{Policy<br/>schema · limits}
  P -->|approved| H[Human approval<br/>outside the model]
  M -.optional, verified only.-> C[Confidential compute<br/>future, unnamed]
```
> Fail-closed at every arrow: no verification → no remote call; no policy pass → no action; secret detected → refuse, don't echo.

## Layers
1. **Small model core** — Qwen2.5-7B-Instruct + QLoRA (Qwen2.5-0.5B for CPU smoke). Tuned and gated to refuse secret echo, crime assist and prompt injection (refusal eval R1/R2/R3, CI exit 1 on any fail). Runs locally by default.
2. **Sanitizer** — strips PII and secrets on input and before any remote call; also wraps `role:tool` output as untrusted data (`privacy/sanitizer.py`, TS parity in `phase2/SANITIZER.md`).
3. **Agent layer** — tool-calling loop with hard step/tool caps. Read-only tools first. Anything that would change state is **propose-only**: the model emits a structured proposal, policy checks it, a human approves. The model never holds keys or credentials.
4. **Policy engine** — schema validation, allowlists, rate and spend limits (`privacy/policy_spend.py` stub; counters non-durable).
5. **Remote inference (optional)** — only when local hardware isn't enough, and only to environments that pass a fail-closed verification client (`phase1.5-attestation/`) with a pinned allowlist. Future direction: hardware-backed confidential compute, provider unnamed.

## Privacy principles
Local first. Send as little as possible. No prompt logs by default. Verify before any remote call. Treat everything the agent reads — web, email, files, tool output — as hostile input.

## Security & key management
- The model never holds raw keys, tokens or passwords. Credentials live in a separate store the model can't read.
- Proposal → schema validation → policy (allowlists, limits) → human approval above thresholds → execution outside the model.
- The model may explain privacy concepts but refuses to help with fraud, laundering or credential theft.

## Phases (summary; see ROADMAP.md)
1. Small model + refusal eval — gate done; dataset parked
1.5. Privacy merge gate — items (1)–(5) signed off
2. Agent loop, tools, sanitizer — M1–M3 green; propose-only pattern kept as safe tooling
3. Local-first product (packaging, quantized export, personal-agent UX)
4. Hardening + optional confidential compute

## Archived prior work (not the product)
The original scaffold targeted on-chain crypto: a specific cloud TEE inference provider, on-chain read tools, intents-based settlement, MPC chain signing, smart contracts, an agent marketplace and staking-for-credits. Phase 2 M4 produced a reviewed propose-only stub set for that path (`phase2/DESIGN_M4_NEAR_INTENTS.md`, `phase2/EVIDENCE_PHASE2_M4_G2_STUBS.md`); execute/sign (G3) was never opened. Evidence stays in place as engineering history. Original assumptions A1–A6 are retired with it.
