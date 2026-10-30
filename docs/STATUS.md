# Status — Salomon

_Updated Thu Oct 29, 2026, ~20:40 PDT (America/Vancouver)._ Full dated log: [docs/notes/STATUS_HISTORY.md](notes/STATUS_HISTORY.md) · engineering log: [PROGRESS.md](PROGRESS.md).

## Product

Salomon is **aiming to be** a local-first research agent on Android for **investigative journalists, private investigators, and researchers** who cannot send sensitive sources or documents to cloud AI.

- On-device by default; fail closed when no local model is connected.
- Credentials never enter the model.
- Export and other consequential actions are propose-only with explicit approval.
- Remote only if opted in and labeled — never a silent fallback.

Niche: [PRODUCT_NICHE](notes/PRODUCT_NICHE.md) · scope: [PRODUCT_SCOPE](notes/PRODUCT_SCOPE.md) · plan: [PHASE_PROFESSIONAL_MVP](notes/PHASE_PROFESSIONAL_MVP.md) · pricing: [PRODUCT_PRICING_FREE_PRO](notes/PRODUCT_PRICING_FREE_PRO.md) · claims: [CLAIMS_FLAGS](notes/CLAIMS_FLAGS_PROFESSIONAL_NICHE.md).

## Phase

**Phase 3 — Professional Android MVP. M1 in flight (not green).**

| Item | State |
|---|---|
| M0 — scope / niche lock | **Done** |
| M1 — local `ask` end-to-end, fail closed | **In flight** — today on web companion (`POST /api/ask`); CLI secondary |
| M2 — document ingest + source-ID masking | **Gated** — criteria accepted, not opened, not shipped |
| M3 — explicit export approval UX | **Gated** — not opened, not shipped |
| Android app / Play / on-device phone inference | **Not shipped** (M-A0 scaffold only) |
| Hybrid / verified remote | **Not shipped** |

## Foundation

| Area | State |
|---|---|
| Phase 2 — agent loop, sanitizer, caps, propose-only | **Green** (M1–M3) |
| Phase 1.5 items (1)–(4) — threat model, verified-remote client, sanitizer, policy stub | **Signed** |
| Phase 1.5 item (5) / refusal eval | **Historical only** — invalidated for product claims; rebuild pending |
| Phase 1 dataset | **Parked** — refresh toward source/PII/secret must-not-echo when unparked |

## Next

1. Turn M1 green: desk → `/api/ask` + offline smoke ([runbook](notes/PHASE3_MVP_RUNBOOK.md)).
2. Privacy-domain rebuild evals (journalism must-not-echo).
3. Open M2 (ingest + mask), then M3 (approvals), then signed Android build.

## Recent tips (main)

`f17f291` / `82a0d9d` niche lock · `7477723` scope + pricing · `e228e24` ROADMAP scrub · `527d8e9` / `2a402f0` residual fold · this pass: repo organization (REPO_LAYOUT, docs indexes, STATUS split).

## Links

[README](../README.md) · [REPO_LAYOUT](REPO_LAYOUT.md) · [ROADMAP](ROADMAP.md) · [ARCHITECTURE](ARCHITECTURE.md) · [SECURITY](../SECURITY.md) · [docs hub](README.md)
