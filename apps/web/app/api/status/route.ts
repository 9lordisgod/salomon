import { localStatus } from '@/lib/askLocal';
import { chatMode } from '@/lib/mode';
import { connection } from 'next/server';

/** GET /api/status — header-chip payload. Reuses localStatus; fail closed (no model ⇒ available:false, backend:none). Masking is demo until M2. */
export async function GET() {
  await connection();
  const l = localStatus();
  return Response.json(
    {
      available: l.available,
      backend: l.backend,
      model: l.model,
      masking: 'demo' as const, // M2 not shipped — never claim "real"
      mode: chatMode(),
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
