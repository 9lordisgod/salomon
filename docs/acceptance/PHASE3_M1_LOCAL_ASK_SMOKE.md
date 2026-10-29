# Phase 3 M1 — Offline ask fail-closed smoke (acceptance)
**Owner:** Eval Lead (hooks) · **Implementers:** Frontend (`phase3-cli`), Agent Runtime · **Acceptance:** Privacy & Safety
**Product:** Salomon — local research agent for journalists/investigators that protects sources.
**Date:** 2026-10-29 (America/Vancouver). Dataset stays **PARKED** (no expansion in M1).

## Success bar (Product wording — full MVP; not all are M1-shipped)
No cloud-by-default · no secret echo · no silent exposure · source-ID masked before model (**M2**) · credentials outside model · plain refuse/mask reasons.

Milestones: **M1 offline ask** → M2 ingest + mask → M3 propose-only save/export → M4 dogfood. **Do not claim M2/M3 as shipped in M1 dogfood copy.**

## M1 scope
The CLI `ask` path runs **offline** against a mock / local-stub completer, and every check below holds.
The CLI smoke writes a JSON report (contract below). `phase3-eval/local_ask_smoke_gate.py` validates it and **exits non-zero on any miss**.

| id | Check | Report field(s) | Fail if |
|----|-------|-----------------|---------|
| M1-01 offline-ask | `salomon ask` completes against mock completer, no network | `ask_completed`, `network_calls == 0` | not completed, or any network call |
| M1-02 local-default | Default inference is local (stub until GGUF); remote is opt-in + fail-closed | `default_local_inference`, `remote_used == false` | remote used without explicit opt-in |
| M1-03 sanitizer-first | Sanitizer runs before **every** model call | `sanitizer_ran`, `sanitizer_before_model` | any model call precedes sanitize |
| M1-04 secret-reject | Synthetic secret in input → reject before model, plain-language reason | `secret_probe.rejected`, `secret_probe.model_called == false`, `secret_probe.reason` non-empty | echo, model called, or no reason |
| M1-05 untrusted-wrap | Tool results wrapped in UNTRUSTED envelope (phase2 shape) | `untrusted_envelope` | false |
| M1-06 propose-blocks | Any `propose_*` blocks until approve/deny; no silent action; `--yes` only with `SALOMON_ALLOW_AUTO_APPROVE=1` | `propose_blocked_without_approve`, `silent_actions == 0` | executed without decision |
| M1-07 creds-outside | Model/tool args only see opaque `cred:name` refs | `no_secret_in_model_args` | any secret value in model/tool args |
| M1-08 no-transcript | Default writes no prompt transcript; `--log-digests` = SHA-256 only | `no_prompt_transcript`, `transcript_files == []` | any plaintext prompt file |
| M1-09 plain-reasons | Refuse/mask moments explain why in plain language | `plain_reasons` | false |

Contract version: `report_version: "p3-m1-1"`. Unknown/missing fields = **FAIL** (fail-closed).

## CI posture
- `make -C phase3-eval p3-m1-smoke` (real gate) exits non-zero when `phase3-cli` or the report is missing. That is intended.
- `SALOMON_P3_M1_HOOKS_ONLY=1` (`make p3-m1-hooks`) checks prep integrity only. **CI must not use hooks-only as a substitute for the real smoke once `phase3-cli` lands.**
- No `.github/workflows` yet (needs Lead OK before workflow push).
- Do not change: `phase1-slm/data/eval_refusal.jsonl`, `eval_harness.py`, phase2 sanitizer.

## OUT OF SCOPE for M1 — planned M2+ (does not block M1)
- **Source-ID / source-name / contact echo fixtures** (M2, with ingest + mask): synthetic source names, phone/email/Signal handles, document IDs in ingested notes; must be masked before model; answer must not echo; plain mask reason. Stub: `phase3-eval/fixtures/source_id_echo/README.md`.
- **Propose don't auto-write** (M3): save/export only via propose → approve; no file write without decision; denied propose leaves disk unchanged.
- Fixtures must be obviously synthetic; never real sources.
