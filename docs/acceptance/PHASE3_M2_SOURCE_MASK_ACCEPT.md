# Phase 3 M2 — Source-ID mask/redact acceptance criteria

**Status:** CRITERIA **ACCEPTED** (Lead skim 2026-10-29). **M2 is NOT OPEN. M2 is NOT shipped.** Engineering only after M1-live (GGUF) green.  
**Owner (criteria):** Privacy & Safety  
**Implementers (when Lead opens M2):** Agent Runtime · Frontend · (sanitizer path as agreed)  
**Consumers:** Lead, Docs, Product, Eval  
**Related:** `PHASE3_M1_SOFT_REVIEW.md` · `THREAT_NOTES_JOURNALIST_MVP.md` (J-T7) · `SECURITY_SHIP_REFLECTION_PS_NICHE.md`  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Sequencing (Lead):** M1-live GGUF in flight in parallel. **M2 engineering starts only after M1 green** — this file is the mask bar only (not anonymity/completeness).

> Acceptance **document only** — **mask/redact bar**, not anonymity or completeness claims. Do not mark ROADMAP/STATUS M2 done, do not claim “source IDs masked” in shipping copy, and do not treat browser `lib/mask.ts` demo heuristics as this gate.

---

## Goal (tight)

Before any **notes / transcript / document text** reaches a model (local or remote), **source-identifying spans** in that text are **masked or redacted**, with a **plain-language reason** when masking fires or when the path refuses. Secrets continue to use the existing **reject** path (orthogonal).

This gate does **not** open journalism must-not-echo model evals (needs dataset unpark + separate PS/Eval criteria).

---

## In scope (MVP accept bar)

### A. What counts as source-identifying (MVP classes)

| Class | Examples (synthetic fixtures only) | Accept behavior |
|-------|------------------------------------|-----------------|
| Contact | email, phone (E.164-ish), social handle `@…` | Mask to stable token or redact; original must not appear in model-bound text |
| Person name | Given + family in notes (e.g. `Maria Lopez`) | Mask or redact; no cleartext in model-bound text for fixtures |
| Source label | `codename` / `source:` / quoted alias used as ID | Mask alias; do not leave clear alias in model-bound text |
| Employer / role tie (minimal) | “works in procurement at City Hall”-style fixture where a **named person + org** pair is in the prompt | At least the **person name** masked; org-only lines may remain (document residual) |

Out of MVP class completeness: full NER, multilingual names, addresses as locations, photos, voice, device IDs, newsroom CMS metadata. Residual → later milestone / P4; **do not claim covered**.

### B. Where it must run

1. **Before model** on every path that sends user notes/docs into a completer: local ask, demo/remote chat if still present, tool-assembled context that includes pasted notes.
2. **Fail closed on masker error:** internal error → do **not** send cleartext; return deny / refuse with plain reason (e.g. `source_mask_failed`).
3. **Secrets unchanged:** existing secret scan / sanitizer **reject** still wins over mask; never “mask” a seed/key into the model as a token that preserves the secret.
4. **Untrusted wrap** for tool/file output remains required (Phase 2); M2 does not replace R3.

### C. UX / copy (blocking for M2 ACCEPT stamp)

| Allowed after M2 ACCEPT | Forbidden even after M2 ACCEPT |
|-------------------------|--------------------------------|
| “Source-identifying fields are masked before the model (MVP classes: …)” | “Sources are always protected / anonymous / untraceable” |
| “Review the mask map; heuristics can miss” | “Complete PII redaction” / “NER guarantee” |
| Point at this accept doc + residual list | “Legally privileged” / “newsroom-ready” / “E2E encrypted notes” |
| Keep Lead-approved README hero unchanged | Equating demo `mask.ts` with M2 in STATUS/ROADMAP |

Demo UI may keep a **labeled** heuristic until M2 implementation lands; it must stay worded as **demo / not M2**.

### D. Minimum evidence (all required)

1. **Unit fixtures (≥8)** covering email, phone, handle, person name, codename/source alias, mixed paragraph, secret-present (must **reject**, not mask-through), masker-throw → fail closed.
2. **Integration:** notes attached to ask/chat → model-bound payload contains **no** cleartext of the fixture originals for classes A; secrets path still rejects.
3. **No silent bypass:** env flag that skips mask in prod/dogfood default = DENY (test-only skip must be explicit + labeled, same spirit as stub).
4. **Docs:** ROADMAP/STATUS say M2 ACCEPT only after PS stamp; shipping strings soft-skimmed (S1 carry-forward).
5. **Diff from demo:** evidence note states how production path differs from (or replaces) `apps/web` / salomon-app `lib/mask.ts` regex demo — demo alone **cannot** earn ACCEPT.

---

## Explicit non-claims (stamp language)

M2 ACCEPT means **only** the in-scope bar above. It does **not** mean:

- Anonymity network, legal privilege, or editorial judgment replaced  
- Perfect recall of all identifying detail  
- Journalism must-not-echo eval green (separate; dataset PARKED)  
- M3 propose-only save/export  
- Credentials vault  
- Cloud-by-default removed (that is M1/S2)  

---

## Sign-off process

| Step | Owner |
|------|--------|
| Criteria Lead-skim (this doc) | Lead Architect — **ACCEPTED 2026-10-29** |
| M2 OPEN (implementation) | Lead — separate go |
| Implement + evidence | Runtime / Frontend |
| PS ACCEPT / DENY stamp | Privacy & Safety |
| Copy soft-skim if new guarantee language | PS + Docs |

**PS stamp fields (when evidence lands):** `privacy_safety_approver`, `evidence_paths[]`, `accepted_at` (America/Vancouver), `residuals[]`.

Until Lead opens M2 and PS stamps evidence: **M2 = not shipped.**

---

## Residuals tracked (non-blocking for criteria; blocking for overclaim)

- Location / address as source-ID  
- Multilingual / single-token names  
- Journalism R2-style echo suite (unpark + Eval)  
- Server-side mask map retention / audit without storing clear IDs  
- Full threat-model upgrade from `THREAT_NOTES_JOURNALIST_MVP.md` before newsroom pilot

---

## Soft copy handoff (Docs — M1 window)

Lead: fix in docs/UI copy **now** (does not open M2):

| Location | Soft overclaim | Suggested tighten |
|----------|----------------|-------------------|
| `ARCHITECTURE.md` sanitizer bullet | "Strips PII and secrets" + implies source name/number never leave cleartext | Secrets (+ address redact today); **source-ID mask = M2** (this accept doc). Do not claim general PII / source shield shipped. |
| salomon-app Sources (`app/sources/page.tsx`) | "Only the masked version ever leaves this page"; empty map "No identifying details detected" | Demo heuristic; can miss; Research may use labeled remote; empty map ≠ "none present." |
