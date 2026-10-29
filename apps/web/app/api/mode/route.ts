import { connection } from 'next/server';
export async function GET() {
  await connection(); // read env at request time
  const live = Boolean(process.env.AI_GATEWAY_API_KEY);
  return Response.json({ mode: live ? 'gateway' : 'demo', model: live ? (process.env.SALOMON_MODEL ?? 'anthropic/claude-sonnet-5.5') : null, local: false });
}
