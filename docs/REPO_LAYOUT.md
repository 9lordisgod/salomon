# Repo layout

How the Salomon repository is organized. Salomon is a local-first research agent for investigative journalists, private investigators, and researchers. **Android is the primary product surface (not shipped yet); the web app is a companion.**

| Path | Purpose |
|---|---|
| `apps/android/` | **Primary surface.** Android app scaffold (M-A0 shell/stub only; no Play listing, no on-device phone inference yet). |
| `apps/web/` | **Companion surface.** Next.js web app + `POST /api/ask`; today's Phase 3 M1 dogfood surface. Modes are labeled (`LOCAL` / `DEMO · stub` / `DEMO · REMOTE`). |
| `crates/` | Rust workspace crates (`salomon-core`). |
| `phase1-slm/` | Model config, dataset builder (dataset **parked**), QLoRA, refusal eval harness, local inference. |
| `phase1.5-attestation/` | Fail-closed verified-remote client + model allowlist (optional future confidential compute). |
| `phase2/` | Agent loop with hard caps, read-only tools, TS sanitizer, propose-only pattern. |
| `phase3-cli/` | Phase 3 CLI (secondary to the web/Android surfaces). |
| `phase3-eval/` | Phase 3 eval gates (local-ask smoke). |
| `phase3-platform/` | Phase 3 platform layer (design + code). |
| `phase3-runtime/` | Phase 3 runtime design and M1 evidence notes. |
| `privacy/` | Sanitizer and policy stubs (secret filter; credentials stay outside the model). |
| `docs/` | Records: acceptance, threat models, reviews, sign-offs, notes. Hub: [docs/README.md](README.md). |
| `.github/` | Repo automation. |

## Root files

| File | Purpose |
|---|---|
| [README.md](../README.md) | What Salomon is, who it's for, how it protects work. |
| [SECURITY.md](../SECURITY.md) | Security rules and gate artifacts. |
| [LICENSE](../LICENSE) | Proprietary license (all rights reserved). |
| [NOTICE](../NOTICE) | Copyright and third-party attribution pointer. |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Internal contribution rules. |
| `.editorconfig` · `.gitignore` · `Cargo.toml` | Editor, ignore, and Rust workspace config. |

## Project documents (`docs/`)

| File | Purpose |
|---|---|
| [STATUS.md](STATUS.md) | Short current status (history: [notes/STATUS_HISTORY.md](notes/STATUS_HISTORY.md)). |
| [ROADMAP.md](ROADMAP.md) | Phase plan. |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design. |
| [PROGRESS.md](PROGRESS.md) | Dated engineering log. |
| [REPO_LAYOUT.md](REPO_LAYOUT.md) | This map. |

Code trees keep their `phase*` paths for history; no code moves are planned.
