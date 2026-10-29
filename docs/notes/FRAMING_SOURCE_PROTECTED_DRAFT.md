# Framing — source-protected research agent (DRAFT for Lead + Privacy & Safety)

**Status:** LOCKED by yoxi (2026-10-29) as product framing direction.  
**Audience:** Lead Architect · Privacy & Safety. **Docs STATUS fold:** applied ~16:05 PDT (README hero still held).  
**Not shipping yet:** Do **not** rewrite README hero or public copy until Docs folds the STATUS note. **PS SOFT CLEAR** 2026-10-29 (soft edits applied: one-liner + Do-list name mask+attest).  
**Owner:** Product · **Date:** 2026-10-29 ~16:04 PDT (America/Vancouver)

---

## One-liner (locked framing — not yet the public hero)

> **Source-protected research agent for journalists** — local by default; heavier work only on verified remote after mask, sanitization, and attestation.

Niche who/job unchanged: journalists and investigators; protect sources. Crypto remains parked.

---

## What this framing means

| Layer | Rule |
|---|---|
| **Privacy floor** | Source identities, contacts, raw notes, mask map, and credentials stay on-device. Model never holds credentials. |
| **Default engine** | Local / offline `ask` (`POST /api/ask` → `askLocal`). Fail closed if the local model is missing. |
| **Optional remote** | Verified confidential compute only — opt-in, never default, never silent fallback. |
| **Consequential actions** | Propose ≠ act. Save / export / send / publish need human approval outside the model. |
| **Untrusted inputs** | Documents, web, email, tool output, and remote completions are hostile / injection-prone. |

---

## Local floor (always on)

These never depend on remote availability:

1. **Source-ID handling** — After M2: mask / redact before any model context (local or remote). Mask map stays local and user-visible.
2. **Sanitizer** — Secrets rejected; tool output wrapped untrusted (Phase 1.5 / Phase 2 — already built).
3. **Refusal / must-not-echo** — Local model path keeps CI-gated refusal bar (Phase 1).
4. **Approvals UX** — Propose-only save/export (M3); credentials outside the model.
5. **Mode honesty** — UI badges engines accurately (`LOCAL` · `VERIFIED REMOTE` · `DEMO stub` · never badge stub/gateway as protected).

Until M2 ACCEPT, **do not** claim that clear source identities are kept out of model context.

---

## Remote gate (ordered, fail closed)

No remote completion may run unless **every** step passes, in order:

```text
mask (M2) → sanitize → attest (fail-closed) → complete
```

| Step | Requirement |
|---|---|
| **1. Mask** | Source-identity masking applied to the outbound payload (M2 ACCEPT required before any product remote path). Clear names / emails / phones / handles / code names must not ride remote in the clear. |
| **2. Sanitize** | Existing sanitizer gate: secrets rejected; payload scrubbed; tool/history treated untrusted. |
| **3. Attest** | Phase 1.5 fail-closed verify client against pinned allowlist. No proof → no call. Unknown instance → DENY. |
| **4. Complete** | Completions only on the attested path. Response treated as untrusted data before re-entering the loop or UI. |

**Forbidden:**

- Auto-fallback from local → remote on model missing, slow, or error.
- Cloud-by-default or “just use the gateway” as the Research desk path.
- Calling today’s demo `/api/chat` gateway **as** “verified remote” (gateway ≠ attested confidential compute).
- Remote path before M2 source-mask ACCEPT.
- Provider brand names in product hero copy (keep unnamed; archive/history only).

**On any gate failure:** stay local or refuse with a plain-language reason. Never silently retry on cloud.

---

## Sequence (unchanged)

1. **M1 live** — Offline/local `ask` green (Research → `/api/ask` only; stub ≠ LOCAL).
2. **M2 mask** — Source-identity masking before the model + eval/accept.
3. **Hybrid spike (later)** — Explicit opt-in `VERIFIED REMOTE` behind mask→sanitize→attest→complete; PS soft-review before any claim.

Dataset stays **PARKED** until Lead unparks (then journalism / source-protection corpus, not crypto).

---

## Copy do / don’t

### Do
- “Local by default.”
- “Optional verified remote after sanitization and verification.”
- “Sources / identifying details stay on your device unless you opt into a verified path — and even then, only masked, sanitized, and attested payloads leave.”
- “Salomon proposes; you approve.”
- “Fail closed if the local model is missing.”
- Label modes: `LOCAL` · `VERIFIED REMOTE` · `DEMO · stub` · `DEMO · remote (not verified)`.

### Don’t
- “Source-safe” / “guaranteed anonymity” / “nothing ever leaves your device” once remote exists (unless carefully scoped to *clear* identities + local floor).
- “Cloud AI for journalists” / cloud-first screenshots or hero.
- Equating demo gateway with verified confidential compute.
- Claiming M2/M3 behaviors before they are ACCEPT.
- Naming a TEE/cloud provider in README hero.
- Implying Salomon replaces editorial, legal, or source-protection judgment.

### Public hero
STATUS fold + PS soft-clear done. Keep current public hero until Docs lands the migration one-liner:

> Local research agent for journalists/investigators that protects sources.

Migration target (Docs, when Lead opens README): the PS-corrected one-liner at the top of this note.

---

## STATUS note

Folded by Docs ~16:05 PDT. Soft-edit reminder for any one-liner quotes: say **mask, sanitization, and attestation** (not sanitize alone). README hero still held.

---

## Risks PS should weigh on skim

1. **Claim dilution** — Broader framing invites overclaim if remote ships before M2.
2. **Habit risk** — If remote is faster, reporters may abandon local; mitigate with default-local + explicit opt-in + no auto-fallback.
3. **Gateway confusion** — Existing demo remote must stay clearly “not verified.”
4. **Attestation reality** — Client pattern is signed; production plugs/allowlist discipline still required before product remote claims.

---

## Related

- `docs/notes/HYBRID_TRUST_BOUNDARIES.md`
- `docs/acceptance/PHASE3_M2_SOURCE_MASK_ACCEPT.md`

- Niche: `docs/notes/PRODUCT_NICHE.md` (land if missing) · Runbook: `PHASE3_MVP_RUNBOOK.md`
- M1 product bar: `PHASE3_M1_PRODUCT_ACCEPTANCE.md`
- Architecture: local-first + optional confidential compute (README / ARCHITECTURE)
- Attestation: `phase1.5-attestation/` · Sanitizer: `privacy/` + `phase2/SANITIZER.md`
