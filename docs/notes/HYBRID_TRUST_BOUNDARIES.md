# Hybrid trust boundaries — source-protected framing (F2 / Framing A)

**Status:** DRAFTED for Lead (2026-10-29). Framing **LOCKED** (yoxi): source-protected research agent.  
**Owner:** Privacy & Safety  
**Does not:** open M2 eng · rewrite README/niche (Docs owns STATUS) · equate DEMO gateway with verified remote  
**Related:** `FRAMING_SOURCE_PROTECTED_DRAFT.md` · `SECURITY_REFLECTION_HYBRID_SOURCE_PROTECTED.md` · `PHASE3_M2_SOURCE_MASK_ACCEPT.md` · `THREAT_NOTES_JOURNALIST_MVP.md`

---

## Lanes

```text
[Device]
  notes / mask map / credentials / approvals
       |
       |- DEFAULT > sanitize (secrets reject) > LOCAL askLocal
       |              fail > refuse (local_model_unavailable | input_refused | ...)
       |              NEVER > remote
       |
       |- OPT-IN > mask (M2) > sanitize > attest (fail-closed) > VERIFIED REMOTE complete
                      any fail > DENY / stay local — no silent retry on unverified cloud

DEMO · REMOTE (gateway) = dogfood only; not a product source-protected path; never default.
```

| Lane | When | What may leave device |
|------|------|------------------------|
| **LOCAL** | Default | Nothing for inference (on-device). Secrets never enter model. |
| **VERIFIED REMOTE** | Explicit opt-in **and** M2 ACCEPT **and** attest pass | Masked + sanitized payload only; no credentials; no clear source-ID classes in M2 bar |
| **DEMO · REMOTE** | Explicit preferRemote + gateway key (today) | Masked demo text possible — **not** attested; UI must say not verified; **no product claim** |
| **DEMO · stub** | Stub env | No network; not a local model |

---

## Deny matrix (fail closed)

| Condition | Required outcome | Forbidden |
|-----------|------------------|-----------|
| Local model missing / unloadable | Refuse (`local_model_unavailable`); plain reason | Auto-fallback to remote or stub-as-LOCAL |
| Secret / key_material in context | `input_refused` (422); model not called | Mask-through of secrets; log cleartext |
| Source masker error (when M2 eng live) | Refuse (`source_mask_failed`); no cleartext send | Proceed without mask |
| M2 not yet ACCEPT | No **product** verified-remote path | Claiming "source-protected remote" |
| Attest fail / unknown instance / allowlist miss | DENY; no complete | Retry on unverified gateway |
| Sanitize fail | DENY / refuse | Send unsanitized |
| User did not opt in to remote | Stay on local lane | Silent promote to remote |
| Remote completion returns | Treat as **untrusted**; propose≠act | Auto save/export/send/publish |
| DEMO gateway used | Badge DEMO · REMOTE · not local / not verified | Badge as VERIFIED or LOCAL |

**Hard rule:** `local_missing ≠ remote`. `attest_fail ≠ unverified cloud`. `DEMO ≠ verified`.

---

## Claim table (S1-style)

| Allowed | Forbidden |
|---------|-----------|
| Local by default; fail closed if local model missing | Cloud-by-default; "just works in the cloud" |
| Optional verified remote after **mask → sanitize → attest** | "TEE / cloud means sources are safe to paste raw" |
| Identifying details stay on-device at the privacy floor; remote sees masked+sanitized only (after M2 ACCEPT) | "Nothing ever leaves your device" once any remote exists (unless carefully scoped) |
| DEMO gateway labeled not verified | Equating demo `/api/chat` with verified confidential compute |
| Salomon proposes; you approve | Act-without-approval; newsroom-ready / legal privilege |
| Lead-approved README hero until Docs+PS fold | "Source-safe" guarantee chrome; naming TEE vendor in hero |
| Point at M2 accept doc for mask bar | Claiming M2/M3 shipped before stamps |

---

## Graduation: DEMO · REMOTE → VERIFIED REMOTE

All required:

1. M2 source-mask **ACCEPT** stamped on the outbound path used for remote  
2. Sanitizer pre-gate on that path (secrets reject orthogonal)  
3. Phase 1.5 attest-before-prompt wired; fail closed; allowlist discipline  
4. UI badge + copy distinguish VERIFIED vs DEMO  
5. PS soft-skim of claims before STATUS/README fold  

Until then: keep preferRemote gateway as **dogfood DEMO only**.

---

## Sequence (unchanged)

1. **M1-live** green (GGUF / offline ask)  
2. **M2 eng** (after M1-live) against `PHASE3_M2_SOURCE_MASK_ACCEPT.md`  
3. **Hybrid spike** — verified remote behind this deny matrix; PS soft-review before product claim  

Crypto parked. Dataset PARKED until Lead unparks (journalism corpus, not crypto).
