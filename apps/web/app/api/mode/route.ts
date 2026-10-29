import { localStatus } from '@/lib/askLocal';
import { connection } from 'next/server';
export async function GET() {
  await connection(); // dynamic per request (cacheComponents forbids `dynamic` export)
  const l = localStatus();
  const gw = !l.available && !!process.env.AI_GATEWAY_API_KEY;
  return Response.json({
    mode: l.available ? 'local' : gw ? 'gateway' : 'demo',
    model: l.available ? l.model : gw ? (process.env.SALOMON_MODEL ?? 'anthropic/claude-sonnet-5.5') : null,
    local: l.available, demo: !l.available,
  }, { headers: { 'cache-control': 'no-store' } });
}
