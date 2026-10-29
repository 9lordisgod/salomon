import { localStatus } from '@/lib/askLocal';
import { chatMode, gatewayAvailable, gatewayModel } from '@/lib/mode';
import { connection } from 'next/server';
export async function GET() {
  await connection();
  const l = localStatus();
  const mode = chatMode();
  const gw = gatewayAvailable();
  return Response.json({
    mode,
    backend: l.backend,
    model: mode === 'local' ? l.model : null,
    local: mode === 'local',
    remote: false, // remote is only ever an explicit per-request client opt-in
    gatewayAvailable: gw,
    gatewayModel: gw ? gatewayModel() : null,
  }, { headers: { 'cache-control': 'no-store' } });
}
