// Thin wrapper over Agent Runtime askLocal (near-privacy-ai/phase3-runtime, DESIGN_M1_LOCAL_ASK.md §6).
// Messages come only from Runtime REASONS. No gateway, no HF pull, no cloud fallback.
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { askLocal as runtimeAskLocal, DEFAULT_LOCAL_MODEL, deny, findAskLocalScript, REASONS, CAPS, type AskRequest, type AskResult, type LocalCompleterLike } from '@salomon/runtime';

export { deny, REASONS, CAPS };
export type { AskResult };

export type LocalStatus = { available: boolean; backend: 'gguf' | 'transformers' | 'stub' | 'none'; model: string };

/** LOCAL only when a real on-device model path exists; stub is demo; else unavailable (fail closed). */
export function localStatus(env: NodeJS.ProcessEnv = process.env): LocalStatus {
  const script = findAskLocalScript(env);
  const backend = (env.SALOMON_BACKEND as 'gguf' | 'transformers') || 'gguf';
  if (script && backend === 'gguf' && env.SALOMON_GGUF && existsSync(env.SALOMON_GGUF)) return { available: true, backend: 'gguf', model: env.SALOMON_GGUF.split('/').pop()! };
  if (script && backend === 'transformers' && env.SALOMON_LOCAL_MODEL) return { available: true, backend: 'transformers', model: env.SALOMON_LOCAL_MODEL };
  if (env.SALOMON_ALLOW_ASK_STUB === '1') return { available: true, backend: 'stub', model: 'offline-stub' };
  return { available: false, backend: 'none', model: '' };
}

// Demo-only completer: never a model. Runtime still runs its sanitizer pre-gate + agent loop.
const STUB_ANSWER = 'DEMO stub: your question passed the privacy checks and stayed on this machine. No local model is installed, so no real answer was generated.';
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const stubCompleter: LocalCompleterLike = {
  kind: 'local',
  async complete(_m, body) { const i = JSON.stringify(body); return { local: true, response: { choices: [{ message: { content: STUB_ANSWER } }] }, requestHash: sha(i), responseHash: sha(STUB_ANSWER) }; },
};

export async function askLocal(req: unknown): Promise<AskResult> {
  const st = localStatus();
  if (st.backend === 'stub') {
    const r = await runtimeAskLocal(req as AskRequest, { completer: stubCompleter, model: DEFAULT_LOCAL_MODEL });
    return r.ok ? { ...r, backend: 'mock', model: 'offline-stub' } : r;
  }
  return runtimeAskLocal(req as AskRequest); // real model or Runtime fail-closed (local_model_unavailable)
}
