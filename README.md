# Salomon

> **Salomon is a local-first research agent for investigative journalists, private investigators, and researchers who handle sensitive sources or documents and cannot send that material to cloud AI.**

Documents and notes stay on-device. AI analyzes them without leaking source identity or secrets. Explicit approval for any export. Fail-closed when no local model is connected. Credentials never enter the model. Remote only if the user opts in and the path is labeled — never a silent fallback.

> Status: Android app / Play listing / on-device phone inference **not shipped yet**; today's surface is the web companion + privacy foundation. Source-identity masking (M2) and export approvals (M3) are **not shipped**.

1. **Local-first, fail closed (goal).** The model is designed to run on-device by default and fail closed when no local model is connected. Phase 3 M1 (local `ask`) is in flight; the current surface is a Next.js web app that may run in a labeled `DEMO · REMOTE` / `DEMO · stub` mode. Remote paths are opt-in and labeled — never silent, never default.
2. **Sources and secrets stay protected.** The model won’t echo keys or sensitive material, and it never holds credentials. Source-identity masking before the model is Phase 3 **M2 — criteria accepted, not opened, not shipped**.
3. **You decide every consequential step.** The agent proposes; policy and you approve before anything is exported, sent, published, or changed.

```mermaid
%%{init: {'theme':'base','themeVariables':{'dark':'#0a0a0a','background':'#0a0a0a','primaryColor':'#18181b','primaryTextColor':'#fafafa','primaryBorderColor':'#a1a1aa','secondaryColor':'#09090b','secondaryTextColor':'#fafafa','secondaryBorderColor':'#71717a','tertiaryColor':'#27272a','lineColor':'#a1a1aa','textColor':'#fafafa','mainBkg':'#18181b','nodeBorder':'#a1a1aa','clusterBkg':'#000000','titleColor':'#fafafa','edgeLabelBackground':'#18181b'}}}%%
flowchart LR
  A[Documents and notes] --> B[Sanitizer: secret filter]
  B --> C[Local model on device]
  C --> T[Read-only tools, hard caps]
  T --> B
  C --> P{Policy}
  P -->|fail| X[Blocked: plain-language reason]
  P -->|pass| H[You approve export outside the model]

  classDef mono fill:#18181b,stroke:#a1a1aa,color:#fafafa
  class A,B,C,T,P,X,H mono
```

Flow in words: documents and notes go through the sanitizer into a local model; read-only tools loop back through the sanitizer; policy either blocks with a plain reason or asks you to approve export outside the model.

---

## Why Android

Android (Google Play or APK) is the primary product path so a source-protected research agent can live on the phone professionals already use in the field. The web app is a companion surface. The Android app is not shipped yet — this is the product direction.

> Today's code is the privacy foundation (sanitizer, local ask path, refusal gates) plus the web companion. See [STATUS.md](STATUS.md).

## Who it's for

Investigative journalists, private investigators, and researchers who work with sensitive sources or documents and cannot put that material into cloud AI. Niche lock: [docs/notes/PRODUCT_NICHE.md](docs/notes/PRODUCT_NICHE.md). Pricing proposal: [docs/notes/PRODUCT_PRICING_FREE_PRO.md](docs/notes/PRODUCT_PRICING_FREE_PRO.md). Phase plan: [docs/notes/PHASE_PROFESSIONAL_MVP.md](docs/notes/PHASE_PROFESSIONAL_MVP.md).

## How Salomon handles it

- **Local-first, fail closed.** Designed to run on your device by default with logs off; remote is opt-in and labeled. Offline mode fails closed on a cache miss.
- **Refuse / must-not-echo.** Target: a 7B-class model gated by a refusal eval that fails CI on any secret echo, crime assist or prompt-injection slip. Prior 8/8 signoff is **historical only** until privacy-domain rebuild re-runs green.
- **Sanitizer on every boundary.** A heuristic filter redacts common secret patterns (plus limited PII) on input and before any remote call; it is not a complete PII guarantee. All tool output is wrapped as untrusted data. Source-ID masking is Phase 3 **M2 — criteria accepted, not opened, not shipped** ([criteria](docs/acceptance/PHASE3_M2_SOURCE_MASK_ACCEPT.md)).
- **Read-only tools, hard caps.** The agent loop enforces step and tool limits. Anything that would send, publish or change something is **propose-only**.
- **Credentials outside the model.** The host holds them. The model never sees raw keys, tokens or passwords.
- **Plain-language refusals.** When Salomon refuses or strips something, it says why.
- **Optional confidential compute (future).** If a bigger model is needed, remote calls go only to an environment that passes a fail-closed verification check. No proof means no call. No provider is named or required.

**Salomon is not:** a consumer chatbot, a cloud-by-default service, or an agent that exports or acts without your approval.

## Where we are

```mermaid
%%{init: {'theme':'dark','themeVariables':{'dark':'#0a0a0a','background':'#0a0a0a','primaryColor':'#003b00','primaryTextColor':'#39ff14','primaryBorderColor':'#39ff14','secondaryColor':'#001a00','secondaryTextColor':'#39ff14','secondaryBorderColor':'#00ff41','tertiaryColor':'#002200','lineColor':'#39ff14','textColor':'#39ff14','mainBkg':'#001a00','nodeBorder':'#39ff14','clusterBkg':'#000000','titleColor':'#39ff14','edgeLabelBackground':'#001a00'}}}%%
flowchart LR
  P1["Phase 1: small model that refuses (historical gate, dataset parked)"] --> G["Phase 1.5: (1)-(4) signed · (5) rebuild pending"]
  G --> P2["Phase 2: agent loop, sanitizer, caps (M1-M3 green)"]
  P2 --> P3["Phase 3: Professional Android MVP (M1 in flight)"]
  P3 --> P4["Phase 4: hardening, optional confidential compute"]

  classDef neon fill:#001a00,stroke:#39ff14,color:#39ff14
  class P1,G,P2,P3,P4 neon
```

| Phase | Status |
|---|---|
| Phase 1 — small model that refuses | Historical gate; item (5) INVALIDATED for product claims; dataset parked |
| Phase 1.5 — privacy gate | (1)–(4) signed; (5) historical only — rebuild pending |
| Phase 2 — agent loop, sanitizer, caps | M1–M3 green |
| Phase 3 — professional Android MVP | M1 in flight (not green); M2/M3 gated |
| Phase 4 — hardening, optional confidential compute | Not started |

- **Phase 1 (historical gate).** Qwen2.5-7B-Instruct + QLoRA harness. Prior refusal eval was **8/8** on 7B (`docs/signoffs/SECURITY_SIGNOFF_REFUSAL_7B.md`; R3 cleared at `docs/signoffs/SECURITY_SIGNOFF_R3_NEARECHO_DELTA.md`) — **INVALIDATED for product claims** after crypto-domain remove; refusal **NOT GREEN** until privacy rebuild re-run. See `docs/notes/CRYPTO_DOMAIN_REMOVED.md`. Dataset **parked** (`SEED=[]` rebuild path). When unparked, refresh toward general privacy (PII, secrets, keys).
- **Phase 1.5.** Threat model, fail-closed verified-remote client, sanitizer, and policy stub: items **(1)–(4) signed** in `docs/signoffs/`. Item **(5)** historically signed — **INVALIDATED for product claims**; rebuild pending.
- **Phase 2 (M1–M3 green).** Agent loop with hard caps, TS sanitizer on `role:tool` output, multi-step read-only tool chaining, and a reviewed propose-only pattern. Execute/sign was never opened. The safe agent-loop pattern (caps, sanitizer, propose-only) is green; research web dogfood is **Phase 3 M1 in flight** (local ask path). Ingest/mask (M2) and propose-save (M3) are **not shipped**.
- **Phase 3 (M1 in flight, not green).** **Goal surface:** Android app (not shipped). **Today:** Next.js web app + `POST /api/ask`; CLI secondary. M1 is not green until desk → `/api/ask` + offline smoke pass. A Q4_K_M GGUF is pinned and scripts exist, but there is **no live local GGUF** / on-device phone inference until that lands.
- **Prior framing:** earlier niche experiments were retired from the product narrative; this repo is pure local-first AI.

Status of record: [STATUS.md](STATUS.md) · plan: [ROADMAP.md](ROADMAP.md) · design: [ARCHITECTURE.md](ARCHITECTURE.md).

## Repo map

```
.
├── README.md  ARCHITECTURE.md  ROADMAP.md  STATUS.md  PROGRESS.md
├── SECURITY.md  .gitignore
├── docs/            acceptance · threat-models · reviews · signoffs · notes  (index: docs/README.md)
├── phase1.5-attestation/   fail-closed remote-verify client + model allowlist
├── phase2/          agent loop, read-only tools, sanitizer, propose-only pattern
├── privacy/         sanitizer + policy/spend stubs
└── phase1-slm/      model config, dataset builder, QLoRA, refusal eval, local inference
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

- **No secrets in the model, ever.** Keys and credentials live outside it; anything consequential needs policy plus your approval.
- **Fail closed.** No verification → no remote call. Policy fail → no action. Secret-scan hit → no dataset.
- **Local first.** Local by default (remote opt-in and labeled), prompt logs off, heuristic secret/PII redaction before any remote call (source-ID mask = M2, not shipped).
- **Everything the agent reads is untrusted.** Web pages, emails, files and tool output are treated as possible injection.

## Docs

[ARCHITECTURE](ARCHITECTURE.md) · [ROADMAP](ROADMAP.md) · [STATUS](STATUS.md) · [SECURITY](SECURITY.md) · [phase1-slm/README](phase1-slm/README.md)

---

🔒 This repo stays **private** until the architecture and security model are stable. It contains no secrets, real keys, user PII or source material.