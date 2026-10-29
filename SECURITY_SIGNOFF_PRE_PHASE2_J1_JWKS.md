# Sign-off — Pre–Phase-2 J1 (NRAS JWT/JWKS) + soft hygiene
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Bar:** `PRE_PHASE2_ACCEPTANCE.md`; residual **J1** in `SECURITY_SIGNOFF_PRE_PHASE2_R1_R2_E2E.md`  
**Evidence:** `phase1.5-attestation/EVIDENCE_PRE_PHASE2_J1_JWKS.md`  
**Recomputed:** `npm test` → **76/76**; `tsc --noEmit` clean.  
**Allowlist:** still `{ "entries": [] }` ⇒ deny-all. No invented pins/fixtures.

## Decision
**SIGNED OFF** for:
- **J1** — NRAS body JWT **ES384-verified against JWKS before** reading `x-nvidia-overall-att-result`
- Soft hygiene (stale NRAS comment, `DESIGN_PROVIDER_TEE.md` opener, prod `autoWireProductionPlugs`)

Does **not** authorize verified remote, populate allowlist, or open Phase 2.

## Checklist

| Item | Verdict | Notes |
|------|---------|-------|
| **J1 verify path** | **Pass** | `verifyNrasJwt` → kid-select EC P-384 → `cryptoVerify` sha384/ieee-p1363 96-byte → require `exp`, honor `nbf` (+60s) → then boolean claim. Fail-closed deny codes covered; no bypass. Header still ignored. |
| **JWKS URL** | **CONFIRMED** | Default `https://nras.attestation.nvidia.com/.well-known/jwks.json` (`NRAS_JWKS_URL`, overridable). Cited in NVIDIA OpenAPI [JWKS Key Set](https://docs.api.nvidia.com/attestation/reference/keys) on server `nras.attestation.nvidia.com`. Live probe 2026-10-29: 212× EC P-384 + `nv-eat-kid-prod-…` + x5c (leaf + Intermediate). Same host as `/v3/attest/gpu`. Matches NEAR AI SDK default. |
| Soft hygiene | **Pass** | Stale follow-up comment gone; DESIGN opener accurate; auto-wire only when production plugs required, still runs `assertPlugsProductionReady`, opt-out `false`, explicit stubs still throw. |

## PS rulings (requested)

| # | Ruling | Severity |
|---|--------|----------|
| **J2 — x5c → NVIDIA root** | **Required before live GPU trust.** Do **not** treat bare JWK `x`/`y` as sufficient once we leave the unit-test path. Live JWKS ships `x5c` = leaf (`CN=NVIDIA Attestation Service GPU GH100`) + Intermediate (`… Intermediate 004`, issuer `NVIDIA Attestation Service CA 001`). Root is **not** in the bundle — pin CA 001 (and/or Intermediate 004/005 SPKIs) and require chain + leaf SPKI match to JWK coords. Trusting coords alone is a known footgun if JWKS content is substituted. Until J2 ships, trust anchor remains TLS to `nras.attestation.nvidia.com` only. |
| **J3 — unknown-kid refetch** | **Required before live GPU soak.** Leaf certs ~12h; JWKS currently ~212 kids. On `nras_jwks_kid_not_found`: **one** forced cache-bust JWKS fetch (ignore TTL once), re-select; still missing ⇒ deny. Cap 1 refetch per verify. Keep 10m TTL for happy path. Without this, rotation → false deny under cache. |
| Soft | Prefer claim `iss === "https://nras.attestation.nvidia.com"` (NEAR SDK does). Refresh `DESIGN_REAL_PLUGS.md` § NRAS (still header-era wording). |

## Still blocking verified remote
Item **(6)** PS allowlist; genuine TDX+collateral; real NEAR RTMR3 sample; real nvidia+NRAS sample (will exercise live JWKS); real `provider_tee` ecdsa sample; **J2** + **J3** before live GPU acceptance.

## Gate
**Phase 2 BLOCKED.** Empty allowlist deny-all. J1 ≠ verified remote. No waive.

## Update (same day)
**J2 + J3 + iss cleared** — see `SECURITY_SIGNOFF_PRE_PHASE2_J2_J3.md`. Intermediate pins approved; CA 001 deferred until NVIDIA publishes.
