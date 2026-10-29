# Evidence — Pre–Phase-2 J2 (x5c pin) + J3 (unknown-kid refetch) + soft iss

Follows `SECURITY_SIGNOFF_PRE_PHASE2_J1_JWKS.md`. Allowlist unchanged (`{entries:[]}` deny-all). No fixtures invented. No Phase 2 / no waive.

## Live JWKS probe (2026-10-29 ~08:50 PDT, `https://nras.attestation.nvidia.com/.well-known/jwks.json`)
- 212 keys, all `EC`/`P-384`, every key has `x5c` of length **2**: `[leaf, intermediate]`.
- Leaf CN: `NVIDIA Attestation Service GPU GH100` (~12h validity, RSA-signed by intermediate). 212/212 leaf SPKI == JWK x/y; 212/212 leaf signatures verify against the presented intermediate.
- Intermediates presented (both issuer `CN=NVIDIA Attestation Service CA 001, O=NVIDIA Corporation, C=US`):

| CN | SPKI sha256 | notAfter |
|---|---|---|
| NVIDIA Attestation Service GPU Intermediate 004 | `fd32837f954e2c45db073105166dfe6985ae0480bb113fba63b091a75affe896` | 2029-12-08 |
| NVIDIA Attestation Service GPU Intermediate 005 | `ba14d00377699189b6762c22c744a9dbdc62aa9396097ada7150426c6ff39afc` | 2030-10-08 |

- With prod pins against live JWKS: 96 keys PASS (32 via 004, 64 via 005); 116 DENY `nras_jwks_x5c_expired` (stale kids with expired leaves still published — correct fail-closed).

## J2 — code (`src/realPlugs.ts`)
- `NRAS_X5C_PINNED_SPKI_SHA256` (frozen) = the two intermediate SPKI digests above. Injectable `x5cPins` (tests only).
- `verifyJwkX5c`: x5c required (≥2 certs) else `nras_jwks_x5c_missing`; parse fail ⇒ `_invalid`; leaf SPKI ≠ JWK x/y ⇒ `_leaf_mismatch`; walk chain with `checkIssued`+`verify` until a pinned SPKI (non-leaf) ⇒ pass; broken link ⇒ `_chain_broken`; none pinned ⇒ `_unpinned`; any walked cert out of validity ⇒ `_expired`. Runs before signature check; bare coords never trusted.

## J3
- `JwksFetch(url, {force})`; `cachedJwksFetch` keeps 10m TTL, `force` bypasses + refreshes cache. Unknown kid ⇒ exactly one forced refetch per verify ⇒ still missing ⇒ `nras_jwks_kid_not_found`; refetch error ⇒ `nras_jwks_unavailable`.

## Soft — iss policy
- `iss === "https://nras.attestation.nvidia.com"` required. Missing ⇒ `nras_jwt_iss_missing` (fail-closed), wrong ⇒ `nras_jwt_iss_mismatch`. `DESIGN_REAL_PLUGS.md` NRAS wording refreshed.

## Tests
- `npm test` **85/85** (was 76; +9 J2/J3/iss), `tsc --noEmit` clean. Synthetic test chain generated at test time via openssl (`test/x5cTestChain.ts`) — not an NVIDIA fixture, never in prod pins.

## Ambiguities for PS
1. **CA 001 SPKI not pinned**: live x5c does not include CA 001, so its SPKI can't be derived from JWKS. Pinned intermediates 004/005 instead. If PS wants CA 001 pinned, needs the CA 001 cert from an NVIDIA source (and chains would need to include it, or we'd add a trust-anchor lookup).
2. Intermediate rotation (a future 006) ⇒ deny until a PS-approved pin PR.
3. Live NRAS JWT `iss` value not yet observed on a real sample (needs real nvidia_payload) — if NRAS omits/varies `iss`, live GPU will deny until reviewed.
4. No revocation (CRL/OCSP) checks on the chain.
