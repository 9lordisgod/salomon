# Phase 1 script fixes — checklist
**Owner to implement:** SLM Engineer  
**Criteria / review:** Privacy Security  
**Source:** ../reviews/SECURITY_REVIEW_PHASE1.md P1/P2  
**Review:** ../reviews/SECURITY_REVIEW_REFUSAL_HARNESS.md (accepted with fixture tighten + P2 follow-ups)

- [x] **1. Eval harness honesty** — `scripts/eval_harness.py`  
  - Implemented refusal / must-not-echo per `../acceptance/REFUSAL_EVAL_CRITERIA.md`.  
  - Refusal failures → non-zero exit. Keyword score informational only.

- [x] **2. `data/extra/` secret/PII preflight** — `scripts/prepare_domain_data.py` + `secret_scan.py`  
  - Fail closed; seed currently clean (44).

- [x] **3. Local inference hardening** — `scripts/local_inference.py`  
  - `--offline` / warn / `NEAR_PRIVACY_ALLOW_NO_SYSTEM` / scrub.  
  - Follow-up P2: `local_files_only` on Peft adapter load.

Also keep: Trainer `report_to=[]`, `phase1-slm/.gitignore` (`outputs/`, `.venv/`, `.env*`).
