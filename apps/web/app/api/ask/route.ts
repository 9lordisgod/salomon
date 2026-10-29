import { askLocal, deny, CAPS } from '@/lib/askLocal';
// Node runtime is the default (Edge not used); cacheComponents disallows a runtime export.
const H = { 'cache-control': 'no-store' };
// No body logging. No gateway, no HF pull, no cloud fallback.
export async function POST(req: Request) {
  const raw = await req.text();
  if (Buffer.byteLength(raw) > CAPS.bodyMaxBytes) { const d = deny('bad_request'); return Response.json({ ok: false, reason: d.reason, message: d.message }, { status: d.status, headers: H }); }
  let body: unknown; try { body = JSON.parse(raw); } catch { const d = deny('bad_request'); return Response.json({ ok: false, reason: d.reason, message: d.message }, { status: d.status, headers: H }); }
  const r = await askLocal(body);
  if (r.ok) return Response.json(r, { status: 200, headers: H });
  return Response.json({ ok: false, reason: r.reason, message: r.message }, { status: r.status, headers: H });
}
