# Soft re-skim — Solana Mobile docs tip (S1 hero tense fix)

**Date:** 2026-10-29 ~17:50 America/Vancouver  
**Reviewer:** Privacy & Safety  
**Ask (Lead):** S1 re-skim tip `f0e8fa1` on main — Docs closed prior soft-deny. Expect SOFT CLEAR if tense/honesty holds.  
**Skimmed:** `/workspace/near-privacy-ai/README.md` + `STATUS.md` (match `docs-handoff-ps-s1-hero/`). **SHA `f0e8fa1` not verified as a git object on this box.** Prior: `SECURITY_SOFT_SKIM_SOLANA_MOBILE_DOCS.md` (SOFT DENY).

## Verdict: **SOFT CLEAR**

Prior S1 blocker lifted. No new soft-deny. Constraints hold: M1 not green; M2 eng NOT OPEN; hybrid / mobile app / Seed Vault signing / chain actions not claimed shipped; no product `@salomon` handle in these docs.

## Checklist

| Item | Result |
|------|--------|
| README hero goal/direction tense | **CLEAR** — “aiming to be…”; “Seed Vault for signing”; parenthetical **(Mobile app / Seed Vault signing / chain actions not shipped yet.)** |
| Why Solana Mobile | **CLEAR** — “aims to run…”; “would be explicit and signed…”; status callout **not shipped** unchanged |
| STATUS Framing A residual | **CLEAR** — hero opened for Solana; goal-tense noted; “README hero held” removed |
| STATUS Phase header | **CLEAR** — `3 (Solana Mobile MVP; journalist research secondary)` |
| Standing constraints | **CLEAR** — Latest + Framing A: M1 not green; M2 eng NOT OPEN; hybrid/mobile/Seed Vault/chain not shipped |

## Soft residuals (non-blocking)

1. **STATUS niche blurb (line 3)** still quotes present-tense “notes stay on your phone, Seed Vault signs…” while README hero is goal-tense. Prefer aligning the niche quote with the README hero (or mark “direction / not shipped”).  
2. **`docs/notes/PRODUCT_NICHE.md` on this tree** still shows the pre-pivot journalist lock (mtime ~16:01); STATUS/README point at it for Solana niche. Docs should fold the Solana `PRODUCT_NICHE` (as in `/workspace/piv/`) so the linked niche matches the hero.  
3. Tip SHA `f0e8fa1` not API-verified here — re-ping if tip ≠ skimmed tree.

## Standing

- M2 eng **NOT OPEN** until M1-live green. Demo gateway ≠ verified remote.  
- Keys / seed material never in the model; Seed Vault remains **intended** signer, not a shipped integration claim.

## Sign-off

Prior SOFT DENY on README hero present tense is **lifted**. No further PS action unless Docs wants a follow-up skim after niche-quote / PRODUCT_NICHE fold.
