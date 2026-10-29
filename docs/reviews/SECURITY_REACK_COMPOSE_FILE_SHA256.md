# Re-ack — compose_file_sha256 schema + verify
**Reviewer:** Privacy Security  
**Date:** Thu Oct 29, 2026 (America/Vancouver)  
**Against:** `SECURITY_ACCEPTANCE_COMPOSE_FILE_SHA256.md`  
**Code:** `types.ts`, `allowlist.ts`, `verify.ts`, `index.ts`, `DESIGN.md`, `test/composeFileSha256.test.ts`

## Recomputed
- phase1.5 **112/112** (incl. 11 composeFileSha256)
- phase2 **38/38**
- measurements.json **unchanged** `09ce9a2d…cbb8` (correct — migration separate)

## Verdict
**Schema + verify ACCEPTED.** Open the GLM migration PR.

## Checklist vs acceptance
| Rule | Status |
|------|--------|
| Optional `compose_file_sha256` 64-hex via `H()`; malformed ⇒ `allowlist_load` | Pass |
| After CM verify: latest eligible `compose_up` (non-empty `file_sha256` + valid ISO) exact match | Pass (`checkComposeFilePins` after `verifyComposeManager`) |
| mismatch ⇒ `compose_file_sha256_mismatch`; none ⇒ `compose_file_sha256_missing_up` | Pass |
| Omit field ⇒ today’s behavior | Pass |
| CM-missing still first (`compose_manager_missing`) | Pass |
| No re-hash of `app_compose`; no network fetch | Pass |
| Observed digest recorded when enforced; log prefix only on mismatch | Pass |
| Both matched pins checked against same observation | Pass |

## Soft (non-blocking)
Observed CM `file_sha256` is lowercased/`0x`-stripped but not length-validated before compare — a garbage digest still DENYs vs a valid pin. Fine for v1.

## Migration approval
You may open the PR that sets **both** GLM rows to  
`compose_file_sha256: "904054f502ccdb2f913d6b80f156ea658b8bc5cb6f8af06082723581d62a45c0"`  
without changing rtmr3/mrconfigid. After that lands, PS will re-hash measurements and offline re-verify both instance fixtures before merge stamp. Abliterated hashes remain unapprovable.
