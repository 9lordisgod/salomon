# phase3-eval — offline ask fail-closed hooks (Phase 3 M1)
Model-free, stdlib-only gate for Salomon's offline `ask` smoke. Criteria: `../docs/acceptance/PHASE3_M1_LOCAL_ASK_SMOKE.md`.

## Run
- Prep self-test: `make -C phase3-eval p3-m1-hooks` (or `SALOMON_P3_M1_HOOKS_ONLY=1 python3 phase3-eval/local_ask_smoke_gate.py`)
- Real gate: `make -C phase3-eval p3-m1-smoke REPORT=path/report.json` (or `SALOMON_P3_M1_REPORT=...`)

| Situation | Exit |
|---|---|
| hooks-only, prep intact | 0 |
| hooks-only, prep broken | 2 |
| no phase3-cli / no report | 2 (fail-closed) |
| report fails any M1 check / wrong version / missing field | 1 |
| report passes all 9 checks | 0 |

**CI must run real smoke + gate, not hooks-only.** Current producer: `phase3-runtime` `npm run smoke:m1`.

## Wiring (Frontend / Agent Runtime)
1. Producer (landed): `phase3-runtime` `npm run smoke:m1 -- --report out.json` writes measured `p3-m1-1` JSON (mock local completer; no weights).
2. Gate: `python3 phase3-eval/local_ask_smoke_gate.py --report out.json` (exit 0 only on 9/9).
3. CI workflow: `.github/workflows/phase3-m1-offline-ask.yml`.

## M2+ (deferred)
`fixtures/source_id_echo/` has a README only. Source-ID echo and propose-don't-auto-write checks are planned there and do not block M1. Dataset stays PARKED.
