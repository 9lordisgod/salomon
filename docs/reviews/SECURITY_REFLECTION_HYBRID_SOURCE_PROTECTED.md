# Architecture reflection — beyond pure local (threat-model lens)

**Owner:** Privacy & Safety  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Audience:** Lead Architect (Product/Docs may reuse STATUS note only after Lead locks)  
**Status:** Framing **LOCKED** (yoxi + Lead 2026-10-29) = F2 / Framing A — source-protected research agent. This doc remains the PS threat-model rationale. **Does not open M2 eng**; M2 still gated on M1-live green. Soft-review Product FRAMING draft when it lands.  
**Constraints:** Fail closed · no cloud-by-default · sanitizer + source protection non-negotiable · credentials never in model · remote outputs untrusted · no overclaims · crypto parked

---

## 1) Three framings (what stays local / what may go remote / promise)

### F1 — Pure local floor (status quo narrative)
| | |
|--|--|
| **Local always** | Notes, mask map, credentials, propose/approve, default completer |
| **Remote** | None as product path (DEMO·REMOTE dogfood only, opt-in, unlabeled-as-product forbidden) |
| **Promise** | “Runs on your machine; sources don’t leave by default.” |
| **Threat fit** | Strongest for J-T1 (no silent cloud). Weakest on capability / hardware. |

### F2 — **Source-protected research agent** (Lead seed — preferred)
| | |
|--|--|
| **Local always (floor)** | Source-IDs + contacts + secrets **never** cleartext off-device; credentials host-only; approve UX; default = local ask |
| **Remote (optional lane)** | Only after **mask/redact (M2 bar) + secret reject + attest-before-prompt**; user opt-in; fail closed if attest/sanitize fails; UI persistent **DEMO·REMOTE** or later **VERIFIED·REMOTE** (never silent) |
| **Promise** | “Source identities stay protected on-device; stronger models only see sanitized text, and only when you opt in and verification passes.” |
| **Threat fit** | Matches assets in `THREAT_NOTES_JOURNALIST_MVP.md`. Uses Phase 1.5 attestation + Phase 2 sanitizer/loop already built. |

### F3 — Confidential-compute default (reject for now)
| | |
|--|--|
| **Local** | Thin client / cache only |
| **Remote** | Default inference in TEE / named cloud |
| **Promise** | “Protected by confidential compute.” |
| **Threat fit** | **Fails** no-cloud-by-default; overclaim risk (TEE ≠ source protection); complexity; crypto-era narrative bleed. **PS: do not adopt as hero.** |

---

## 2) Feasibility vs current stack (hybrid stay fail-closed)

| Piece | Today | Must change for F2 |
|-------|-------|-------------------|
| **askLocal / S2** | Fail closed if local missing; no silent gateway | Keep: missing local ≠ remote. Remote = separate opt-in completer only. |
| **Web desk** | Default `/api/ask`; preferRemote + key → `/api/chat` labeled DEMO·REMOTE | Productize: same control plane; rename demo→verified only after attest path wired; never auto-flip when local fails. |
| **Sanitizer** | Secrets reject + address redact; TS `key_material` (password soft-ACCEPT) | **Before any remote complete:** run full redact/reject; **M2 source-ID mask required before cleartext notes may leave** (criteria ACCEPTED; eng after M1-live). |
| **Attestation client** | Phase 1.5 signed fail-closed verify | Wire verified-remote completer: attest → allowlist → then prompt; attest fail ⇒ DENY (no fallback to unverified cloud). |
| **Agent loop** | Caps, untrusted tool wrap, propose-only | Remote completions = untrusted like tools for downstream steps; no credentials in messages; propose≠act unchanged. |
| **Refusal eval** | R1–R3 crypto-era green on 7B | Journalism must-not-echo still PARKED — hybrid **increases** echo blast radius if notes reach remote masked poorly. |

**Hard rule for hybrid:**  
`local_missing → refuse` remains.  
`remote_opt_in → sanitize(+M2) → attest → complete | DENY`.  
Never `local_missing → remote`.

---

## 3) Risks (how reframe can weaken privacy)

1. **Source exposure** — Mask miss + remote = off-device cleartext (J-T7). Hybrid without M2 eng is **DEMO only**, not “source-protected remote.”
2. **Claim accuracy** — “Protects sources” + mentioning remote invites “cloud-safe” overclaim (J-T2). Need S1-style table for verified-remote copy.
3. **Complexity** — Two completers, two badges, attest UX; misconfig → silent wrong lane.
4. **Stub/DEMO confusion** — Users equate DEMO·REMOTE with product protection.
5. **Remote output trust** — Model may re-identify (“the procurement whistleblower”) even from masked context; outputs must stay untrusted; no auto-publish.
6. **Logging/retention** — Provider logs; digests-only locally; never log pre-mask cleartext.
7. **Weakens privacy if** narrative shifts to “TEE means you can paste anything” or local floor is demoted.

---

## 4) Preferred framing + highest-leverage next step

**Prefer F2 — source-protected research agent** (**LOCKED** Lead+user 2026-10-29) (local floor + default; optional verified remote only after sanitizer + M2 mask + attestation). Aligns with Lead seed and existing engineering. Reject F3 as hero. Keep F1 as M1-live ship narrative until hybrid design note lands.

**Highest-leverage next step (PS-owned, no M2 eng):**  
Write `docs/notes/HYBRID_TRUST_BOUNDARIES.md` (short): lane diagram, deny matrix (`local_missing`, `attest_fail`, `sanitize_fail`, `mask_fail`), claim table (allowed / forbidden), when DEMO·REMOTE may graduate to VERIFIED·REMOTE.  
**Not now:** M2 implementation, Product niche rewrite, README hero change — Lead lock first; M2 eng still after M1-live green.

---

## 5) One-liner + STATUS note

**One-line (candidate — Lead lock required):**  
> Source-protected research agent for journalists — local by default; optional verified remote only after sanitization and attestation.

**STATUS-style (advisory):**  
- PS hybrid reflection 2026-10-29: prefer **source-protected** framing (local floor; remote opt-in after sanitize+attest+M2). Reject confidential-compute-default hero.  
- Fail-closed unchanged: no cloud-by-default; missing local ≠ remote.  
- Next PS doc (if Lead yes): `HYBRID_TRUST_BOUNDARIES.md`. M2 eng still gated on M1-live; criteria already Lead-ACCEPTED.  
- Do not claim hybrid “source-protected remote” until M2 stamped + attest wired on that path.

