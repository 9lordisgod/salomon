# Status — Salomon

_Updated Fri Oct 30, 2026, ~10:10 PDT (America/Vancouver)._ Full dated log: [docs/notes/STATUS_HISTORY.md](notes/STATUS_HISTORY.md) · engineering log: [PROGRESS.md](PROGRESS.md).

## Product

Salomon is **aiming to be** a local-first research agent on Android for **investigative journalists, private investigators, and researchers** who cannot send sensitive sources or documents to cloud AI.

- On-device by default; fail closed when no local model is connected.
- Credentials never enter the model.
- Export and other consequential actions are propose-only with explicit approval.
- Remote only if opted in and labeled — never a silent fallback.

Niche: [PRODUCT_NICHE](notes/PRODUCT_NICHE.md) · scope: [PRODUCT_SCOPE](notes/PRODUCT_SCOPE.md) · plan: [PHASE_PROFESSIONAL_MVP](notes/PHASE_PROFESSIONAL_MVP.md) · pricing: [PRODUCT_PRICING_FREE_PRO](notes/PRODUCT_PRICING_FREE_PRO.md) · claims: [CLAIMS_FLAGS](notes/CLAIMS_FLAGS_PROFESSIONAL_NICHE.md).

## Phase

**Phase 3 — Professional Android MVP.** **M1 GREEN** (Lead, ~21:30 PDT, on PS SOFT CLEAR) — local ask + pinned GGUF offline fail-closed (7B desktop default; 3B mobile only via explicit env); no remote fallback. [soft skim](reviews/SECURITY_SOFT_SKIM_M1_LIVE_GGUF.md) · [evidence](../phase3-runtime/EVIDENCE_PHASE3_M1_LIVE_GGUF.md)

| Item | State |
|---|---|
| M0 — scope / niche lock | **Done** |
| M1 — local `ask` end-to-end, fail closed | **GREEN** (scoped) — local ask + pinned GGUF offline fail-closed; PS SOFT CLEAR ([soft skim](reviews/SECURITY_SOFT_SKIM_M1_LIVE_GGUF.md) · [evidence](../phase3-runtime/EVIDENCE_PHASE3_M1_LIVE_GGUF.md)). Not Android/on-phone. |
| M2 — document ingest + source-ID masking | **Gated** — criteria accepted, not opened, not shipped |
| M3 — explicit export approval UX | **Gated** — not opened, not shipped |
| Android app / Play / on-device phone inference | **Not shipped** — M-A0 scaffold only; **APK unsigned hold** |
| Hybrid / verified remote | **Not shipped** |

## Foundation

| Area | State |
|---|---|
| Phase 2 — agent loop, sanitizer, caps, propose-only | **Green** (M1–M3) |
| Phase 1.5 items (1)–(4) — threat model, verified-remote client, sanitizer, policy stub | **Signed** |
| Phase 1.5 item (5) / refusal eval | **NOT GREEN — 7/8** on the pinned local 7B GGUF + product prompt, offline (Fri ~10:05 PDT; [run note](../phase1-slm/EVAL_REFUSAL_GGUF.md)). Only miss: R3-source-memo echoed "disable safety" inside a correct refusal. Still invalidated for product claims. |
| Phase 1 dataset | **Parked** — refresh toward source/PII/secret must-not-echo when unparked |

## Holds (honest)

- **M1 GREEN is scoped** — local ask + pinned GGUF offline fail-closed only; does not widen to Android, refusal eval, or M2.
- **Item (5) INVALIDATED** — L4 live decline is heuristic only, not refusal-eval green.
- **No Android / Play / on-phone shipped.**
- **M-A0 unsigned Compose APK: PS SOFT CLEAR** ([M-A0 skim](reviews/SECURITY_SOFT_SKIM_MA0_UNSIGNED_APK.md), sha256 `f2b7534…`) — OK for **internal dogfood only after user keystore**; **NOT Play / public**.
- **M2 eng NOT OPEN.**
- **M-A0 unsigned hold** — Compose/Rust scaffold may proceed; no signed/public APK claim.
- **Privacy-rebuild refusal 7/8, NOT GREEN** — first real run on the shipped GGUF path (`make eval-refusal-gguf`, CPU, offline). Needs PS + Eval Lead decision: prompt paraphrase fix (Lead preferred) or fixture ruling on "disable safety". Do not cite 7/8 or historical crypto 8/8 for product.

Token-rotate pause **canceled** (Lead resume ~21:22 PDT). Dual track: Parallel Solana work lives in `9lordisgod/salomon-solana` — **do not** reintroduce crypto into this repo.

## Next

1. Privacy-rebuild refusal to 8/8: PS + Eval Lead decide the R3-source-memo fix (prompt paraphrase line vs fixture ruling), then re-run `make eval-refusal-gguf` on 7B (and 3B mobile). No GPU/Colab needed anymore.
2. User keystore → internal dogfood of M-A0 APK (not Play/public).
3. Open M2 (ingest + mask), then M3 (approvals), then signed Android build (after unsigned hold lifts).

## Recent tips (main)

`e3b50fd` M1 soft skim + evidence · `ae3b41a` crypto hygiene · `eafc14d` docs move + LICENSE · `d5af5c4` org soft sync · `0f18c21` org pass · niche `f17f291` / `82a0d9d` / `7477723` · residual `527d8e9` / `2a402f0`.

## Links

[README](../README.md) · [REPO_LAYOUT](REPO_LAYOUT.md) · [ROADMAP](ROADMAP.md) · [ARCHITECTURE](ARCHITECTURE.md) · [SECURITY](../SECURITY.md) · [docs hub](README.md)
