# Contributing to Salomon

Thanks for your interest! Salomon is open source under the [MIT License](LICENSE),
and contributions are welcome — bug reports, docs fixes, tests, and code.

## Ground rules

1. **Keep the niche.** Salomon is a local-first research agent for investigative
   journalists, private investigators, and researchers. Local-first, fail-closed,
   no credentials in the model.
2. **No overclaims.** Don't describe unbuilt features (source masking, export UX,
   Play listing, on-device phone inference) as shipped. Use goal tense.
3. **Never commit secrets.** No real API keys, tokens, passwords, keys, user PII,
   or source material — in code, tests, fixtures, or docs. Use obviously fake
   values (e.g. `sk-SYNTHETIC…`, `TestPassword!not-real`). Copy
   `apps/web/.env.example` to `.env.local` for local config; it is gitignored.
4. **Small PRs.** Branch from `main`, describe the change and how you tested it.
   Run the relevant tests (`python3 privacy/test_sanitizer.py`, `make test-safety`
   in `phase1-slm/`, `npm test` in the TS packages).
5. **Security-sensitive changes** (sanitizer, policy, attestation, inference,
   logging) need a careful review — call it out in the PR.
6. **UI / charts:** zinc monochrome only — see `docs/notes/CHART_STYLE.md`.

By contributing, you agree your contributions are licensed under the MIT License.

## Security reports

Please report vulnerabilities privately — see [SECURITY.md](SECURITY.md).
