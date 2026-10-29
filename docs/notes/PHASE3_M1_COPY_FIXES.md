# Phase 3 M1 — salomon-app copy fixes (Docs Lead × Frontend)

**Source:** `docs/reviews/SECURITY_SOFT_SKIM_SALOMON_APP_M1.md` (S1 SOFT DENY)  
**When:** 2026-10-29 ~15:41 PDT  
**Goal:** Clear S1 for dogfood/public-demo wording. Frontend owns UI strings; Docs owns app README (updated).

## Approved one-liner
> Local research agent for journalists/investigators that protects sources.

## Docs done
- [`/workspace/salomon-app/README.md`](../../../salomon-app/README.md) — dropped “source-safe” H1; M1 vs M2/M3 claims split; stub ≠ LOCAL.

## Frontend — exact drop-ins (you own these files)

### 1. `components/Shell.tsx` — header tagline
```tsx
// was: Source-safe research
<span className="hidden text-xs uppercase tracking-[0.2em] text-zinc-500 sm:inline">Local research · Phase 3 M1</span>
```

### 2. `app/layout.tsx` — metadata
```ts
export const metadata: Metadata = {
  title: 'Salomon — local research for journalists',
  description: 'A local research agent for journalists and investigators that protects sources. Phase 3 M1 dogfood.',
};
```

### 3. `app/page.tsx` — Research subtitle
```tsx
<p className="mt-1 text-sm text-zinc-400">
  Ask about your notes. Offline <code>/api/ask</code> by default (fail closed if no local model).
  Browser masking is a <strong>demo heuristic, not a guarantee</strong> (M2).
</p>
```

### 4. `app/page.tsx` — Protections card
```tsx
<li>Demo mask heuristic in browser (not a guarantee · M2)</li>
<li>Secrets stripped server-side on ask</li>
<li>Save/export are proposals only (M3 accept pending)</li>
<li>No keys in browser or model context</li>
```

### 5. Stub ≠ LOCAL — `app/api/mode/route.ts` + `Shell.tsx`
`localStatus()` returns `available: true` for `SALOMON_ALLOW_ASK_STUB=1` with `backend: 'stub'`, but mode route currently maps any `available` → `mode: 'local'` → emerald LOCAL badge.

**Prefer** expose backend:
```ts
// mode/route.ts
const l = localStatus();
return Response.json({
  mode: l.available ? (l.backend === 'stub' ? 'stub' : 'local') : gw ? 'gateway' : 'demo',
  backend: l.backend,
  model: l.available ? l.model : gw ? process.env.AI_GATEWAY_MODEL ?? null : null,
  local: l.available && l.backend !== 'stub',
  demo: !l.available || l.backend === 'stub',
});
```
**Shell badge:**
```tsx
{mode?.mode === 'local' ? (
  <span className="…emerald…">LOCAL · offline · runs on your machine</span>
) : mode?.mode === 'stub' ? (
  <span className="…amber…">DEMO · stub · not a local model</span>
) : mode?.mode === 'gateway' ? (
  <span className="…sky…">DEMO · remote · {mode.model} · not local</span>
) : (
  <span className="…amber…">DEMO MODE · stub model · not local</span>
)}
```
Assistant label when stub: `Salomon · stub` (not `Salomon · local`).

### 6. `app/approvals/page.tsx` (optional soften)
Keep propose≠act; add one line: “Approvals UI is dogfood for M3 — not a shipped product gate yet.”

## Claims bar
`docs/notes/PHASE3_MVP_RUNBOOK.md`. S2 ask path ACCEPT — do not weaken fail-closed `/api/ask`. Re-ping Privacy & Safety after landing.
