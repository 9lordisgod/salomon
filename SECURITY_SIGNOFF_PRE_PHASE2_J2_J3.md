# Sign-off — Pre–Phase-2 J2 (x5c pin) + J3 (unknown-kid refetch) + iss
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Bar:** `SECURITY_SIGNOFF_PRE_PHASE2_J1_JWKS.md` required follow-ups J2/J3  
**Evidence:** `phase1.5-attestation/EVIDENCE_PRE_PHASE2_J2_J3.md`  
**Recomputed:** `npm test` → **85/85**; `tsc --noEmit` clean.  
**Allowlist:** still `{ "entries": [] }` ⇒ deny-all. No invented fixtures.

## Decision
**SIGNED OFF** for **J2**, **J3**, and required `iss` claim check.

Does **not** authorize verified remote, populate allowlist, or open Phase 2.

## Checklist

| Item | Verdict | Notes |
|------|---------|-------|
| **J2 x5c** | **Pass** | `x5c` ≥2; leaf SPKI must match JWK `x`/`y`; walk `checkIssued`+`verify` until **non-leaf** (`i>0`) pinned SPKI; validity on walked path; bare coords deny. Prod pins = Intermediate **004** `fd32837f…5affe896` + **005** `ba14d003…6ff39afc`. Re-probed live JWKS: digests match; 96 pass / 116 expired-leaf deny (fail-closed). |
| **J3 kid refetch** | **Pass** | Unknown kid ⇒ exactly one `{force:true}` cache-bust; still missing / duplicate ⇒ deny; known kid keeps 10m TTL. |
| **iss** | **Pass** | `iss === "https://nras.attestation.nvidia.com"`; missing ⇒ `nras_jwt_iss_missing`, wrong ⇒ `nras_jwt_iss_mismatch`. Matches NEAR AI SDK. |

## PS rulings (requested)

| Question | Ruling |
|----------|--------|
| **Pin CA 001?** | **Not required now.** NVIDIA does not publish CA 001 in the JWKS x5c (leaf+intermediate only). Do **not** invent a CA pin. Intermediate 004/005 SPKI pins are the approved trust anchors. If NVIDIA later publishes CA 001 (or embeds it), add via **PS-approved pin PR** as deepening — not a blocker. |
| **Future Intermediate 006** | **Deny until PS pin PR.** No auto-trust of new intermediate CNs/SPKIs. |
| **Real NRAS `iss`** | **Keep required.** Soften only if a captured real NRAS JWT shows a different documented issuer — then stop and ask PS; do not bypass. |
| **CRL/OCSP** | **Accepted residual** for NRAS AS chain (no public NRAS CRL feed in scope). Revisit if NVIDIA publishes one. Device-identity OCSP (`ocsp.ndis.nvidia.com`) is a different PKI — out of scope here. |

## Soft (non-blocking)
- Prefer also assert leaf subject contains `O=NVIDIA Corporation` (defense-in-depth; VoltageGPU-style).
- `DESIGN_REAL_PLUGS.md` header still says “auto-default not done”; § wire-up bullet still header-era — refresh.

## Still blocking verified remote
Item **(6)** PS allowlist; genuine TDX+collateral; real NEAR RTMR3 sample; real nvidia+NRAS sample (will exercise live JWKS+x5c+iss); real `provider_tee` ecdsa sample.

## Gate
**Phase 2 BLOCKED.** Empty allowlist deny-all. J2/J3 ≠ verified remote. No waive.

## Update (same day)
**SOFT cleared** — leaf `O=NVIDIA Corporation` + DESIGN §4/§6: see `SECURITY_SIGNOFF_PRE_PHASE2_J2_J3_SOFT.md` (86/86).
