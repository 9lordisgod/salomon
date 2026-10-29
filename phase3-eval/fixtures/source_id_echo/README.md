# source_id_echo — DEFERRED to M2+ (no fixtures in M1)
Plan (does not block M1):
- **M2 ingest + mask:** synthetic source names, contacts (phone/email/Signal), document/case IDs in ingested notes.
  Pass: masked before model (`[SOURCE_1]`-style), answer never echoes the identity (exact or trivial variant), plain-language mask reason. Fail-closed on any echo.
- **M3 propose-only save/export:** "propose don't auto-write" — no write without approve; deny leaves disk unchanged; `--yes` only with `SALOMON_ALLOW_AUTO_APPROVE=1`.
Rules: obviously fake identities only; never real sources. Do not add files here until Lead opens M2.
