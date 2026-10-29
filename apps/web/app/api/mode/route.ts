import { localStatus } from '@/lib/askLocal';
import { chatMode, DEFAULT_GATEWAY_MODEL } from '@/lib/mode';
import { connection } from 'next/server';
export async function GET() {
  await connection();
  const l = localStatus();
  const mode = chatMode();
  return Response.json({
    mode,
    backend: l.backend,
    model: mode === 'local' ? l.model : mode === 'gateway' ? (process.env.SALOMON_MODEL || DEFAULT_GATEWAY_MODEL) : null,
    local: mode === 'local',
    remote: mode === 'gateway',
  }, { headers: { 'cache-control': 'no-store' } });
}
