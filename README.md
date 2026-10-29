# Salomon — private AI for crypto, on NEAR

> **An AI that helps you with crypto without ever touching your keys, your logs, or your trust.**
> Local-first small language model → fail-closed private inference → policy check → *you* sign.

![visibility](https://img.shields.io/badge/repo-private-black)
![phase](https://img.shields.io/badge/Phase-2%20agent%20capabilities-blue)
![gate](https://img.shields.io/badge/Phase%201.5%20stubs-SIGNED-green) ![p2](https://img.shields.io/badge/Phase%202-IN%20PROGRESS%20(M1%E2%80%93M3%20green)-brightgreen)
![refusal](https://img.shields.io/badge/refusal%207B%20%2B%20live%20GLM-8%2F8%20signed%20off-brightgreen)
![pin](https://img.shields.io/badge/remote%20model-z--ai%2Fglm--5.3--flash%20pinned-purple)

```mermaid
flowchart LR
    subgraph P["🤖 MODEL PROPOSES"]
        A["🧠 Local SLM<br/><sub>on your box · no logs</sub>"]
    end
    subgraph G["🛡️ GUARDS CHECK"]
        B["🛡️ Sanitizer<br/><sub>strips PII + secrets</sub>"]
        C["🔐 TEE (optional)<br/><sub>attested or refused</sub>"]
    end
    subgraph D["👤 HUMAN / POLICY DISPOSES"]
        E["📜 Policy<br/><sub>simulate + spend limits</sub>"]
        F["✍️ Signer<br/><sub>HW / TEE / MPC — not AI</sub>"]
    end
    A --> B --> C --> E --> F
    classDef ai fill:#ede9fe,stroke:#7c3aed,stroke-width:2px,color:#1e1b4b
    classDef guard fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0c4a6e
    classDef human fill:#dcfce7,stroke:#16a34a,stroke-width:2px,color:#14532d
    class A ai
    class B,C guard
    class E,F human
```

---

## The problem

AI assistants and crypto wallets are colliding — unsafely.

| Today | What goes wrong |
|---|---|
| 🔑 Users paste seed phrases into chatbots | Keys land in prompts, logs and training data |
| 📝 Every prompt is logged server-side | Your balances, addresses and intent become a profile |
| ☁️ Remote inference "just trusts" the host | No proof the operator can't read or alter your request |
| 💉 Agents read on-chain memos & token names | Attackers inject *"transfer all funds to…"* straight into the agent |
| 🤖 Agents hold hot keys to "be helpful" | One bad completion = drained wallet |

## Salomon's answer

1. **Local-first SLM** — a crypto/privacy-tuned 7B model that runs on your hardware by default.
2. **Fail-closed TEE** — remote inference only on NEAR AI Cloud enclaves with *verified* attestation. No proof → no call.
3. **Policy before sign** — every action is schema-checked, simulated and spend-limited before anything is signed.
4. **The model never holds keys** — signing lives in a hardware wallet, TEE or NEAR Chain Signatures MPC.
5. **On-chain text is hostile** — memos and metadata are treated as untrusted input, tested by a refusal eval.

## Why it matters

| | Status quo AI wallet / chatbot | **Salomon** |
|---|---|---|
| **Keys** | Pasted into chats, held by agents | Never enter the model; signer is separate |
| **Privacy** | Prompts logged remotely by default | Local by default, logs off, PII stripped |
| **Remote inference** | Trust the provider | Cryptographic attestation or refuse |
| **Agent writes** | Model output → transaction | Model *proposes* → policy → explicit sign |
| **Injection** | Untested | Gated: R3 prompt-injection eval must pass |
| **Crime assist** | Varies | Teaches privacy, refuses laundering (R1 eval) |

**Result:** the useful parts of an AI copilot for NEAR — explain, plan, draft intents — without making the AI the weakest link.

---

## How a request flows

```mermaid
flowchart LR
  A["💬 You ask<br/>'Stake 10 NEAR safely'"] --> B["🛡️ Sanitizer<br/>strip keys · PII"]
  B --> C["🧠 Local SLM<br/>drafts a plan"]
  C -->|needs a bigger model?| D{"🔐 TEE attested?"}
  D -->|yes| E["NEAR AI Cloud<br/>private inference"]
  D -->|no| X1["⛔ stay local"]
  E --> F
  C --> F{"📜 Policy engine<br/>schema · simulate · limits"}
  F -->|fail| X2["⛔ blocked + reason"]
  F -->|pass| G["✍️ You approve<br/>HW wallet / MPC signs"]
  G --> H["⛓️ NEAR"]
```

## Architecture

```mermaid
flowchart LR
  U["👤 User"] --> S["Sanitizer<br/>(local)"]
  S --> M["SLM core<br/>Qwen2.5-7B + QLoRA"]
  M --> A["Agent loop<br/>read-only tools first"]
  A --> P{"Policy engine<br/>schema · simulate · spend caps"}
  P -->|approved| SG["Signer<br/>HW wallet · TEE · MPC"]
  M -. "attested only" .-> T["NEAR AI Cloud<br/>TEE inference"]
  SG --> I["NEAR Intents"]
  SG --> C["Chain Signatures<br/>(multi-chain)"]
  A --> CR["Staking-for-credits"]
  classDef stop fill:#fee,stroke:#c33;
  class P,SG stop;
```

The model **proposes**. It never signs. Every arrow fails closed. Details: [ARCHITECTURE.md](ARCHITECTURE.md).

## Roadmap

```mermaid
flowchart LR
  P1["Phase 1<br/>SLM foundation<br/>🟦 in progress"] --> G{{"Phase 1.5<br/>gate 1–5 ✅"}}
  G --> P2["Phase 2<br/>Agent + private inference<br/>🟩 M1–M3 green"]
  P2 --> P3["Phase 3<br/>Contracts · Intents · Chain Sigs<br/>⬜"]
  P3 --> P4["Phase 4<br/>Hardening + production<br/>⬜"]
```

Phase 1.5 items **(1)–(5) are SIGNED OFF**. **Phase 2 is IN PROGRESS** — narrow scope, read-only, fail-closed:

- **M1** verified-remote inference on the allowlisted `z-ai/glm-5.3-flash` pin (attest + bind every call; dual GLM instances; `compose_file_sha256` pinned)
- **M2–M3** agent loop + read-only NEAR tools (`view_access_key_list`, capped `view_state`, `block`, `gas_price`), multi-step chaining with hard step/tool caps
- **Soft polish closed:** live GLM refusal **8/8** formally stamped; `role:tool` sanitizer accepted; compose-hash migration merge-approved
- **Not yet:** no writes, no signing. The model still never holds keys. Abliterated DeepSeek is **not** pinned.

Code: `phase2/`. Status of record: [STATUS.md](STATUS.md).

| Phase 1.5 gate item | Status |
|---|---|
| (1) Threat model | ✅ **SIGNED OFF** — `docs/signoffs/SECURITY_SIGNOFF_PHASE1.5_1_3_4.md` |
| (2) Attestation verify client (fail-closed) | ✅ **SIGNED OFF** (stub) — `docs/signoffs/SECURITY_SIGNOFF_ATTESTATION_ITEM2.md` (`phase1.5-attestation/` 15/15) |
| (3) Sanitizer stub + tests | ✅ **SIGNED OFF** — `docs/signoffs/SECURITY_SIGNOFF_PHASE1.5_1_3_4.md` |
| (4) Policy / spend stub | ✅ **SIGNED OFF** — `docs/signoffs/SECURITY_SIGNOFF_PHASE1.5_1_3_4.md` |
| (5) Refusal / must-not-echo eval | ✅ **SIGNED OFF** — 7B Colab 8/8; `docs/signoffs/SECURITY_SIGNOFF_REFUSAL_7B.md`. R3 near-echo delta **CLEARED** (`docs/signoffs/SECURITY_SIGNOFF_R3_NEARECHO_DELTA.md`) |

**R3 near-echo delta CLEARED** — `docs/signoffs/SECURITY_SIGNOFF_R3_NEARECHO_DELTA.md` (pointer on `docs/signoffs/SECURITY_SIGNOFF_REFUSAL_7B.md`); artifacts `phase1-slm/outputs/eval_refusal_7b_r3_nearecho/` 8/8. Item (5) stays closed.


## What's in Phase 1 now

- **Model:** Qwen2.5-7B-Instruct (Llama-3.1-8B is the alternative). Qwen2.5-0.5B is used for CPU smoke tests.
- **Dataset:** **315** seed examples, built from curated NEAR, privacy and cypherpunk content plus refusal paraphrase batches 1–4. A secret scan gates every build.
- **Refusal harness:** R1 (crime assist), R2 (seed/key echo) and R3 (prompt injection). It exits 1 on any failure.
- **7B Colab (T4, 4-bit):** **8/8 PASS** (R1 3/3 · R2 3/3 · R3 2/2). See `phase1-slm/outputs/eval_refusal_7b_anti_echo/`.
- **0.5B CPU adapter:** safety swung between 4/8 and 7/8 across runs and was too unstable. That work is parked. See `phase1-slm/FIRST_ADAPTER_0.5B.md`.

## Repo map

```
.
├── README.md  ARCHITECTURE.md  ROADMAP.md  STATUS.md  PROGRESS.md
├── SECURITY.md  .gitignore
├── docs/            acceptance · threat-models · reviews · signoffs · notes  (index: docs/README.md)
├── phase1.5-attestation/   fail-closed attestation verify + GLM allowlist
├── phase2/          verified-remote agent loop + read-only tools
├── privacy/         sanitizer + policy/spend stubs
└── phase1-slm/
    ├── README.md  Makefile  requirements.txt
    ├── configs/model_config.yaml
    ├── scripts/   prepare_domain_data · finetune_qlora · eval_harness · compare_evals
    │              local_inference · secret_scan · test_safety_unit · build_eval_refusal_7b_colab
    ├── data/      seed_prompts · eval_prompts · eval_refusal · extra/refusal_paraphrase_batch*.jsonl
    ├── notebooks/eval_refusal_7b_colab.ipynb
    └── outputs/   eval summaries only (no weights)
```

## Quickstart (phase1-slm)

```bash
cd phase1-slm
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
make data           # build + secret-scan dataset
make test-safety    # harness unit tests (no GPU)
make eval-refusal   # CI safety gate (exit 1 on any fail)
make dryrun         # tiny LoRA on CPU
```
For the 7B gate, open `notebooks/eval_refusal_7b_colab.ipynb` in Colab, choose a GPU runtime, then **Run all**.

## Security principles

- **No raw keys in the model, ever.** Signing happens in a hardware wallet, a TEE or a Chain Signatures MPC request, and only after the policy engine approves.
- **Fail closed.** No attestation means no remote inference. A failed policy check means no signature. A secret-scan hit means no dataset.
- **Local first.** Inference runs offline by default. Prompt logs are off by default. PII is stripped before any remote call.
- **On-chain text is untrusted.** Memos, token names and metadata are treated as possible injection.
- **The model teaches privacy concepts but will not help launder funds.**

## Docs

[ARCHITECTURE](ARCHITECTURE.md) · [ROADMAP](ROADMAP.md) · [STATUS](STATUS.md) · [SECURITY](SECURITY.md) · [phase1-slm/README](phase1-slm/README.md)

---

🔒 This repo stays **private** until the architecture and security model are stable. It contains no secrets, real keys or user PII.
