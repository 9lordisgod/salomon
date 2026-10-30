# Soft skim — Android pivot docs tip (S1)

**Date:** 2026-10-29 ~18:50 America/Vancouver  
**Reviewer:** Privacy & Safety  
**Ask (Lead):** S1 soft skim tip `66c5efd` (`66c5efd6bf1a90ac13cda0d6a2004215b39af30d`) on main. Scope: README hero + Why Android + PRODUCT_NICHE + STATUS Phase header. Expect SOFT CLEAR if honesty holds.  
**Skimmed:** `/workspace/docs-handoff-android-pivot/` (README, PRODUCT_NICHE, STATUS; OVERCLAIMS checklist). Cross-checked `/workspace/near-privacy-ai/` (earlier draft; Phase header wording differs). **Full SHA not verified as a git object on this box.**

## Verdict: **SOFT CLEAR**

No S1 soft-deny. Goal/direction tense holds; explicit not-shipped for Android app / Play listing / on-device phone inference; Seed Vault / chain / hybrid not claimed shipped; crypto optional at most; M1 not green; M2 eng NOT OPEN; no product `@salomon` handle in skimmed docs.

## Checklist

| Item | Result |
|------|--------|
| README hero | **CLEAR** — “aiming to be…”; parenthetical **(Android app / Play listing / on-device phone inference not shipped yet.)**; crypto/on-chain optional at most |
| Why Android | **CLEAR** — direction prose; status callout: Android app (Play / APK), Play listing, on-device phone inference **not shipped**; crypto optional; Solana Mobile not hero |
| PRODUCT_NICHE | **CLEAR** — Android primary locked; “Promise (direction — not all shipped)”; Out of scope lists Play-as-live, Seed Vault, chain, phone model as shipping product |
| STATUS Phase header | **CLEAR** — `3 (Android MVP; Solana Mobile secondary/parked; journalist historical)` |
| Standing constraints | **CLEAR** — Latest: M1 not green; M2 eng NOT OPEN; Seed Vault / chain / hybrid not shipped |

## Soft residuals (non-blocking)

1. Mermaid flow still labels “Local model on device” in present tense; surrounding copy is goal-framed — fine for S1 if hero/status stay honest.  
2. Box `near-privacy-ai/` tree (~18:44) is a slightly earlier draft (Phase “Android local AI MVP…”; PRODUCT_NICHE “awaiting Product lock”; Why Android not-shipped list thinner). Prefer tip/handoff as tip-of-record; re-ping if main ≠ handoff.  
3. Tip SHA `66c5efd` not API-verified here.

## Standing

- M2 eng **NOT OPEN** until M1-live green. Demo gateway ≠ verified remote.  
- Keys / seed material never in the model. Seed Vault / chain remain optional/historical, not shipped claims.

## Sign-off

Android pivot docs pass S1 soft skim. No further PS action unless Docs/Lead re-ping after Product lock fold or a tree mismatch.

## Addendum — PROGRESS soft tip `55330ec` (2026-10-29 ~18:50 PT)

**Ask (Lead):** add-on skim; primary remains `66c5efd`. Same constraints.

**Skimmed:** `/workspace/docs-handoff-android-pivot/PROGRESS.md` (banner + recent entries). Full SHA `55330ec0e97e24bfdb4f4e69b674557b69a39345` not verified as a git object on this box.

### Verdict: **SOFT CLEAR** (add-on; primary `66c5efd` CLEAR unchanged)

PROGRESS latest niche banner: local-first Android AI (Play/APK primary, **goal tense**); Solana optional/secondary; **Android app not shipped; M1 not green.** No present-tense Seed Vault / Play-as-live / hybrid-shipped claims in the new banner. Historical entries remain history.

### Soft residual (non-blocking; ROADMAP body lag, not a PROGRESS deny)
ROADMAP header/mermaid say Android MVP; Phase 3 section title still “Local research agent for journalists (MVP)” with journalist success-bar copy. Prefer Docs fold to Android primary when convenient — not an S1 blocker for this tip set.

Standing: M2 eng NOT OPEN; hybrid / Seed Vault / chain not shipped; no product `@salomon`.
