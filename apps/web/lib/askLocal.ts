import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { explainRefuse } from './refuseReasons';

// Contract: near-privacy-ai/phase3-runtime/DESIGN_M1_LOCAL_ASK.md §6. Stub until Agent Runtime ships askLocal.
export type AskRequest = { question: string; history?: { role: 'user' | 'assistant'; content: string }[]; options?: { maxTokens?: number; maxSteps?: number } };
export type Redaction = { kind: string; placeholder: string };
export type AskOk = { ok: true; answer: string; steps: number; backend: string; model: string; redactions: Redaction[]; transcriptSha256: string };
export type AskReason = 'bad_request' | 'sanitizer_rejected' | 'agent_denied' | 'local_model_unavailable';
export type AskDenied = { ok: false; reason: AskReason; message: string };
export type AskResult = AskOk | AskDenied;

const MSG: Record<AskReason, string> = {
  bad_request: 'That request was not in a form I can read, so nothing was sent anywhere.',
  sanitizer_rejected: 'Your question tripped a privacy check, so nothing was sent anywhere.',
  agent_denied: 'The assistant stopped this request to stay safe. Nothing was sent anywhere.',
  local_model_unavailable: "The local model isn't installed on this device, so nothing was sent anywhere.",
};
export const deny = (reason: AskReason, message = MSG[reason]): AskDenied => ({ ok: false, reason, message });

export function localStatus(): { available: boolean; backend: string; model: string } {
  const g = process.env.SALOMON_GGUF;
  if (g && (!isAbsolute(g) || existsSync(g))) return { available: true, backend: 'gguf', model: g.split('/').pop()! };
  if (process.env.SALOMON_LOCAL_MODEL) return { available: true, backend: 'local', model: process.env.SALOMON_LOCAL_MODEL };
  if (process.env.SALOMON_ALLOW_ASK_STUB === '1') return { available: true, backend: 'stub', model: 'offline-stub' };
  return { available: false, backend: 'none', model: '' };
}

// Strict (redact-level) secret checks: any hit refuses — mirrors keyMaterialInContext, stricter than sanitizeForRemote.
const SECRETS: [string, RegExp][] = [
  ['secret:pem_private_key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['secret:api_key_sk', /\bsk-[A-Za-z0-9_-]{16,}/],
  ['secret:api_key_assignment', /\b(api[_-]?key|secret|password|token)\s*[:=]\s*\S{6,}/i],
  ['secret:near_ed25519_secret', /ed25519:[1-9A-HJ-NP-Za-km-z]{40,}/],
  ['secret:hex_key_64+', /\b(0x)?[0-9a-fA-F]{64,}\b/],
  ['secret:base64_blob', /[A-Za-z0-9+/]{120,}={0,2}/],
  ['secret:key_material_in_context', /\b(private key|seed phrase|mnemonic|recovery phrase)\b/i],
  ['secret:bip39_like_12+_word_run', /\b(?:[a-z]{3,8}\s+){11,}[a-z]{3,8}\b/],
];
const REDACT: [string, RegExp, string][] = [
  ['email', /[\w.+-]+@[\w-]+\.[\w.-]+/g, '[REDACTED_EMAIL]'],
  ['address', /\b0x[0-9a-fA-F]{40}\b/g, '[REDACTED_ADDRESS]'],
];

export async function askLocal(req: unknown): Promise<AskResult> {
  if (!req || typeof req !== 'object') return deny('bad_request');
  const r = req as Record<string, unknown>;
  if (Object.keys(r).some((k) => !['question', 'history', 'options'].includes(k))) return deny('bad_request');
  if (typeof r.question !== 'string' || !r.question.trim() || r.question.length > 8000) return deny('bad_request');
  const o = (r.options ?? {}) as Record<string, unknown>;
  if (typeof o !== 'object' || Object.keys(o).some((k) => !['maxTokens', 'maxSteps'].includes(k))) return deny('bad_request');
  const h = r.history;
  if (h !== undefined && (!Array.isArray(h) || h.length > 10 || h.some((t) => !t || !['user', 'assistant'].includes(t.role) || typeof t.content !== 'string'))) return deny('bad_request');
  const maxSteps = Math.min(12, Math.max(1, Number(o.maxSteps ?? 8) || 8));
  void maxSteps;

  const st = localStatus();
  if (!st.available) return deny('local_model_unavailable');

  const all = [r.question, ...((h as { content: string }[] | undefined) ?? []).map((t) => t.content)].join('\n');
  const hits = SECRETS.filter(([, re]) => re.test(all)).map(([c]) => c);
  if (hits.length) return deny('sanitizer_rejected', explainRefuse(hits));

  let text = r.question;
  const redactions: Redaction[] = [];
  for (const [kind, re, ph] of REDACT) if (re.test(text)) { redactions.push({ kind, placeholder: ph }); text = text.replace(re, ph); }

  return {
    ok: true,
    answer: 'Offline stub: your question passed the privacy checks and stayed on this machine. The Agent Runtime local model (askLocal) is not wired yet, so no answer was generated.',
    steps: 1, backend: st.backend, model: st.model, redactions,
    transcriptSha256: createHash('sha256').update(text).digest('hex'),
  };
}
