# Draft allowlist path (per PRE_PHASE2_ACCEPTANCE.md §B — LOCKED)
- `measurements.json` stays `{"entries":[]}` ⇒ **deny-all** until Privacy Security approves and merges ≥1 non-`test_only` entry.
- Proposals live in `allowlist/DRAFT_<model_slug>.md` or PR text. Never loaded by the client. Never auto-merge pins; no placeholder approvers.
- Schema: unchanged `AllowlistEntry` (model_id, rtmr3, effective_from, notes, privacy_security_approver; mrconfigid or app_compose_sha256; optional event_log_digests[], gpu_evidence_sha256).
- Evidence package per draft: canonical model_id; measured pins; how obtained (gateway path, time, tooling) + digest-only quote verify proof (quote sha256, TCB, advisories); compose/image review; proposed effective_from + notes; request for PS to set approver and merge.
