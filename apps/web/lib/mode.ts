import { localStatus } from '@/lib/askLocal';
// Checked against live ai-gateway.vercel.sh/v1/models (2026-10-29). Override with SALOMON_MODEL.
export const DEFAULT_GATEWAY_MODEL = 'anthropic/claude-sonnet-5.5';
export type ChatMode = 'local' | 'gateway' | 'stub' | 'demo';
export function chatMode(): ChatMode {
  const l = localStatus();
  if (l.available && l.backend !== 'stub') return 'local'; // real on-device model always wins
  if (process.env.AI_GATEWAY_API_KEY) return 'gateway'; // explicit remote, labeled REMOTE in UI
  return l.backend === 'stub' ? 'stub' : 'demo';
}
