# Evidence — J2/J3 soft polish (post PS sign-off)
Date: 2026-10-29 (America/Vancouver). Scope: soft only; no fixtures invented; `allowlist/measurements.json` untouched (empty deny-all). No Phase 2.

1. **Leaf org assert.** Live probe of `https://nras.attestation.nvidia.com/.well-known/jwks.json`: 212/212 keys carry x5c; every leaf subject = `C=US, O=NVIDIA Corporation, CN=NVIDIA Attestation Service GPU GH100`. So fail-closed is safe: `checkLeafOrg` requires exactly one `O=NVIDIA Corporation` (`NRAS_LEAF_ORG`) in `verifyJwkX5c`, after leaf SPKI==JWK match. Missing ⇒ `nras_jwks_x5c_leaf_org_missing`; wrong/lookalike/multiple ⇒ `nras_jwks_x5c_leaf_org_mismatch`. Injectable via `leafOrg` (NrasJwtOpts / NrasGpuVerifier / 4th arg) for tests only. Test chain leaf now `/C=US/O=NVIDIA Corporation/CN=Test Leaf`.
2. **DESIGN_REAL_PLUGS.md** header, §4, §6, prod-guard note refreshed to J1–J3 signed path (no "stub/_not_wired" as current state).
3. **Results:** `npm test` 86/86 (+1 test: org happy/mismatch/missing/lookalike/injected verifier), `tsc --noEmit` clean.
