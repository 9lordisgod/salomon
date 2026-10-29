# Roadmap
**Current: Phase 1 — in progress · Phase 1.5 stub items (1)–(5) SIGNED OFF · Phase 2 BLOCKED · No Phase 2**

```mermaid
flowchart LR
  P1[Phase 1<br/>SLM foundation<br/>IN PROGRESS] --> G{{Phase 1.5<br/>stub 1–5 ✅<br/>P2 BLOCKED}}
  G --> P2[Phase 2<br/>Agent + private inference]
  P2 --> P3[Phase 3<br/>NEAR contracts · Intents · Chain Sigs]
  P3 --> P4[Phase 4<br/>Privacy hardening + prod]
```

## Phase 1 — SLM Foundation
- [x] Model choice (Qwen2.5-7B-Instruct; Llama-3.1-8B alt) — configs/model_config.yaml
- [x] Seed dataset builder + 40+ seed examples, 10+ eval prompts
- [x] QLoRA fine-tune script, eval harness, local inference CLI
- [ ] Expand dataset to 2–5k curated examples (docs, NEPs, privacy papers, on-chain traces)
- [ ] First adapter trained + baseline vs. tuned eval report (0.5B CPU report landed 18:20 PDT, no gain; 7B GPU run pending)
- [ ] GGUF/llama.cpp quantized export for local use

## Phase 1.5 — Privacy merge gate (Lead decision, Oct 28 2026)
Opens after Phase 1 is complete. Stub/criteria items **(1)–(5) all SIGNED OFF**. R3 near-echo delta **CLEARED** (`SECURITY_SIGNOFF_R3_NEARECHO_DELTA.md`). **Phase 2 still BLOCKED** by (b) real DCAP/gateway + PS-approved allowlist and (c) `provider_tee` response binding. No Phase 2 / no waive.
- [x] (1) Threat model doc — SIGNED OFF (THREAT_MODEL_PHASE1.5.md filled, Oct 29 2026). See SECURITY_SIGNOFF_PHASE1.5_1_3_4.md
- [x] (2) Attestation verify client, fail-closed — SIGNED OFF Privacy Security (phase1.5-attestation/ 15/15, Oct 29 2026). Bar: ATTESTATION_ACCEPTANCE.md. Evidence: SECURITY_SIGNOFF_ATTESTATION_ITEM2.md. Phase 2 still blocked: (b) real DCAP/gateway + PS-approved allowlist; (c) provider_tee response binding. (a) R3 near-echo CLEARED.
- [x] (3) Sanitizer stub + unit tests — SIGNED OFF (privacy/sanitizer.py 17/17, Oct 29 2026). See SECURITY_SIGNOFF_PHASE1.5_1_3_4.md
- [x] (4) Policy/spend stub — SIGNED OFF Privacy Security (criteria + privacy/policy_spend.py 11/11, Oct 29 2026). Residuals: non-durable counters (not for real funds); 64-hex ambiguity; human-approval daily total. See SECURITY_SIGNOFF_PHASE1.5_1_3_4.md
- [x] (5) Refusal / must-not-echo eval suite that fails CI — SIGNED OFF by Privacy Security (7B Colab 8/8 anti-echo). Artifacts: phase1-slm/outputs/eval_refusal_7b_anti_echo/, SECURITY_SIGNOFF_REFUSAL_7B.md. R3 near-echo pre-Phase-2 delta **CLEARED** (`SECURITY_SIGNOFF_R3_NEARECHO_DELTA.md`; artifacts phase1-slm/outputs/eval_refusal_7b_r3_nearecho/ 8/8). Item (5) stays closed. Owner: SLM Engineer (harness updates)

Owners: Privacy Security owns gate acceptance and reviews every Phase 2 PR touching tools, remote inference, or keys. Agent Engineer implements attestation verify. SLM Engineer owns refusal eval harness updates.

## Phase 2 — Agent Capabilities
- [ ] Tool schema + read-only tools (NEAR RPC view, account/tx lookup)
- [ ] Agent loop (TS) with injection-safe tool output handling
- [ ] NEAR AI Cloud private inference backend with attestation check

## Phase 3 — NEAR Integration
- [ ] near-sdk Rust contracts: agent registry, credits/staking, access control
- [ ] Intents-based execution prototype (testnet)
- [ ] Chain Signatures signing via policy engine (testnet)
- [ ] Agent Market listing + job/escrow handling
- [ ] CLI/frontend

## Phase 4 — Privacy & Production
- [ ] Local prompt sanitizer/rewriter
- [ ] Policy engine (spend limits, allowlists, simulation)
- [ ] Deployment guides, threat model, open-source release
