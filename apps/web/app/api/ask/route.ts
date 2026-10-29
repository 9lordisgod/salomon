import { askLocal, deny } from '@/lib/askLocal';
// Node runtime is the default (Edge not used); cacheComponents disallows a runtime export.
const STATUS = { bad_request: 400, sanitizer_rejected: 422, agent_denied: 403, local_model_unavailable: 503 } as const;
const H = { 'cache-control': 'no-store' };
// No body logging. No gateway, no HF pull, no cloud fallback.
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 16 * 1024) return Response.json(deny('bad_request'), { status: 400, headers: H });
  let body: unknown; try { body = JSON.parse(raw); } catch { return Response.json(deny('bad_request'), { status: 400, headers: H }); }
  const r = await askLocal(body);
  return Response.json(r, { status: r.ok ? 200 : STATUS[r.reason], headers: H });
}
