# Evidence — Phase 1.5 item (2) attestation verify client

**Status: SIGNED OFF by Privacy Security (2026-10-29).** See `/workspace/near-privacy-ai/SECURITY_SIGNOFF_ATTESTATION_ITEM2.md`. No Phase 2 / no waive; live remote still DENY until real plugs + approved allowlist.
Date: Thu Oct 29, 2026 ~07:52 PDT.

## Paths
- Bar: /workspace/near-privacy-ai/ATTESTATION_ACCEPTANCE.md (unchanged)
- Package: /workspace/near-privacy-ai/phase1.5-attestation/
- Design: .../DESIGN.md
- Source: .../src/{verify,client,allowlist,digestLog,quoteVerifier,fetchReport,types,nonce,index}.ts
- Allowlist (empty ⇒ deny-all): .../allowlist/measurements.json
- Tests: .../test/attestation.test.ts (test_only fixture written to a temp dir, never to the repo allowlist)

## Results
`npm test` → 1 file, **16/16 passed** (post sign-off follow-ups). `npm run typecheck` (tsc --noEmit) → clean.

## Required-test coverage
| Bar requirement | Test |
|---|---|
| empty model_attestations | "empty model_attestations → DENY" |
| gateway missing / fail | "gateway_attestation missing…", "gateway verify fail / default stub…", client stub test |
| nonce mismatch | "nonce mismatch → DENY" (request_nonce + report_data) |
| QuoteVerifier not configured | "QuoteVerifier not configured → DENY" |
| allowlist miss / empty | "allowlist miss / empty allowlist → DENY", default client denies on repo empty allowlist |
| test_only gating | "test_only entries never load without opt-in or in production" |
| GPU present-but-fail; require_gpu | "nvidia_payload present but GPU verify fails…" (also default=false, require=true+absent DENY) |
| logger rejects prompt | "rejects prompt / apiKey / raw nonce…" |
| nonceHash not raw nonce | "verify emits nonceHash, never raw nonce" |
| happy path mocks only | "happy path: MockQuoteVerifier + mock gateway + test_only allowlist (allowTestOnly)" |
| missing API key | "missing API key fails closed" |

## Post sign-off follow-ups (Privacy Security, non-blocking)
- Added unit test: `SKIP_ATTEST` / `ALLOW_NO_ATTEST` / `NEAR_SKIP_ATTEST` / `ATTEST_SKIP` refuse `AttestationClient` construction (`skip_attest_banned`).
- DESIGN.md + allowlist comment: multiple exact-matching release entries allowed (0 → DENY; take-first OK); dropped “exactly one or DENY” wording.
