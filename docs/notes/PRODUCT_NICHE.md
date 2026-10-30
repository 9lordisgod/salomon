# Product niche — Salomon (LOCKED)

**Locked:** 2026-10-29 ~20:25 PDT by yoxi (Lead Architect ship / Product locked paste).

## Who

**Primary users:** investigative journalists, private investigators, and researchers who handle sensitive sources or documents and **cannot** send that material to cloud AI.

Not the primary audience: consumer chat users, general "personal AI" hobbyists, or any prior domain/mobile-distribution experiments.

## Promise (goal / aiming — honesty)

Local-first research agent. Documents and notes stay on-device by default. AI helps analyze without defaulting sensitive material to a cloud model. Fail closed when no local model is connected. Credentials never enter the model. Export and other consequential actions are propose-only with explicit user approval. Live source-identity masking is a design goal — **not shipped yet**; do not claim it as product fact until M2+.

## Primary surface

**Android** (Google Play / APK) is the shipping goal. Web companion today (M1); CLI secondary. Android app / Play listing / on-device phone inference are **not shipped yet** — today's surface is the web companion + privacy foundation.

## Product priorities (for first paying professionals)

1. On-device / local `ask` that fails closed (M1).
2. Document + notes library with real local ingest.
3. Real source-identity masking before the model (M2) + journalism must-not-echo evals.
4. Explicit approval flows for save / export (M3).
5. Plain-language refuse / mask reasons in the UX.

**Deprioritized:** pure chat / consumer features, cloud-preferred UI, demo-only "Sources" chrome presented as product protection.

## Out of scope / do not claim yet

- Live Play Store listing or on-device phone inference as a shipping product.
- Live source-identity masking (M2 not opened / not shipped).
- Attested remote as a product path (pattern exists; not product-default).
- BYOK / remote as default or silent fallback.
- Enterprise features not built: SSO, full audit suite, MDM, SOC2 marketing, team admin consoles.
- Any crypto narrative.

## Scrubbed from product narrative

Consumer/general "personal AI for everyone" hero language; Solana / Seeker / Seed Vault / NEAR / wallet / DeFi framing (including as optional). See `CRYPTO_DOMAIN_REMOVED.md`.

## Related

- Scope one-pager: `PRODUCT_SCOPE.md`
- Pricing: `PRODUCT_PRICING_FREE_PRO.md`
- Claim flags: `CLAIMS_FLAGS_PROFESSIONAL_NICHE.md`
- Phase plan: `PHASE_PROFESSIONAL_MVP.md`
- Framing (technical): `FRAMING_SOURCE_PROTECTED_DRAFT.md`
