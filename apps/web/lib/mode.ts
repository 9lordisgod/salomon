import { localStatus } from '@/lib/askLocal';
// Checked against live ai-gateway.vercel.sh/v1/models (2026-10-29). Override with SALOMON_MODEL.
export const DEFAULT_GATEWAY_MODEL = 'anthropic/claude-sonnet-5.5';
export type ChatMode = 'local' | 'stub' | 'demo';
/** Default mode is derived from local status only. A gateway key never selects remote by itself. */
export function chatMode(): ChatMode {
  const l = localStatus();
  if (l.available && l.backend !== 'stub') return 'local';
  return l.backend === 'stub' ? 'stub' : 'demo';
}
export function gatewayAvailable(): boolean { return !!process.env.AI_GATEWAY_API_KEY; }
export function gatewayModel(): string { return process.env.SALOMON_MODEL || DEFAULT_GATEWAY_MODEL; }
