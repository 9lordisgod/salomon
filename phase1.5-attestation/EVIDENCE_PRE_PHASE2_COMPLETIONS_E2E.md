# Evidence — Pre–Phase-2 item (7) completions E2E skeleton + R1/R2 fixes
Date: 2026-10-29. Bar: `../PRE_PHASE2_ACCEPTANCE.md` §C. **Not** Phase 2 / no waive / no live Cloud. Allowlist `{"entries":[]}` (deny-all).

Results: `npm test` **74/74** (4 files; was 60 → +12 completions E2E, +2 R1/R2), `tsc --noEmit` clean.

## R1 NRAS (must-fix)
`nrasBodyOverallResult()`: parse body `[["JWT", jwt], …]`, decode payload, pass iff `x-nvidia-overall-att-result === true` (boolean). Header ignored. Tests: true / false / string "true" / missing claim / non-JSON / no JWT / malformed (header=true in deny cases). Open: JWT signature verification vs NVIDIA JWKS.

## R2 Prod guard (must-fix)
`assertPlugsProductionReady` now allowlist-only (`WIRED_PLUG_NAMES`). Test: `totally-trusted` denied. Existing guard test updated to use wired names.

## Item 7 — `src/verifiedCompletion.ts`
Tests `test/verifiedCompletion.test.ts` (mock fetch, mock assertReady, NobleResponseBinder w/ generated secp256k1 keys):
happy path (URLs, `x-no-aliasing`, `accept-encoding: identity`, `?signing_algo=ecdsa`, no content in logs); raw-byte hash ≠ re-stringified; sig over re-serialized body → `signed_text_mismatch`; 404 retry pass at 2 / deny after 3 (`signature_missing`); 0 match; 2 matches; gateway kind; wrong text; empty retain set (no network); missing x-no-aliasing (bind); canonical model forced; chat_id id/chat_id/missing.
