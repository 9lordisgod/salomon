# Product niche — locked

**Decision (2026-10-29, Lead):** Salomon is a **local research agent for journalists and investigators that protects sources.**

- **Who:** investigative reporters, newsroom researchers, fact-checkers, independent investigators, NGO researchers.
- **Job:** read, summarize and cross-reference sensitive material (leaks, interview notes, transcripts, records) on the reporter's own machine.
- **Promise (target across Phase 3 M1–M3; not shipped yet):** sources, contacts and identifying details stay on the device, are not echoed into output, and never reach a remote model without verification. Today: M1 local `ask` is **in flight**; source masking (M2) and propose-save (M3) are **not shipped**; the sanitizer is a demo heuristic, not a guarantee.
- **How (already built):** local small model with a CI-gated refusal / must-not-echo eval (Phase 1), fail-closed remote verification as a pattern (Phase 1.5), injection-safe agent loop with read-only tools, hard caps and a sanitizer on every boundary (Phase 2).

**Out of scope / parked:** crypto, NEAR Intents, tokens, staking, on-chain tools, and any specific cloud TEE provider as product backend. Evidence is kept as history — see [`../archive/crypto/README.md`](../archive/crypto/README.md).
