'use client';
import { useEffect, useState } from 'react';
export type Chip = 'local' | 'stub' | 'missing';
export type ModeInfo = {
  available: boolean; backend: 'gguf' | 'transformers' | 'stub' | 'none'; model: string | null;
  masking: 'demo' | 'real'; mode: 'local' | 'stub' | 'demo'; chip?: Chip;
  gatewayAvailable: boolean; gatewayModel: string | null;
};
/** Fail-closed when status is unreachable or malformed — chip = MODEL MISSING, never stuck checking…. */
const MISSING: ModeInfo = {
  available: false, backend: 'none', model: '', masking: 'demo', mode: 'demo',
  gatewayAvailable: false, gatewayModel: null,
};
function asStatus(raw: unknown): ModeInfo {
  if (!raw || typeof raw !== 'object') return { ...MISSING };
  const s = raw as Record<string, unknown>;
  const backend = s.backend;
  const okBackend = backend === 'gguf' || backend === 'transformers' || backend === 'stub' || backend === 'none';
  return {
    available: !!s.available,
    backend: okBackend ? backend : 'none',
    model: typeof s.model === 'string' ? s.model : s.model == null ? null : String(s.model),
    masking: s.masking === 'real' ? 'real' : 'demo',
    mode: s.mode === 'local' || s.mode === 'stub' ? s.mode : 'demo',
    gatewayAvailable: !!s.gatewayAvailable,
    gatewayModel: typeof s.gatewayModel === 'string' ? s.gatewayModel : null,
  };
}
/** Server chip; derive from Runtime fields if chip is absent. */
export function chipOf(m: ModeInfo): Chip {
  // Lead: MODEL MISSING when !available; LOCAL when gguf/transformers; STUB when stub.
  if (!m.available) return 'missing';
  if (m.backend === 'stub') return 'stub';
  if (m.backend === 'gguf' || m.backend === 'transformers') return 'local';
  return 'missing';
}
/** Fetches /api/status for chip; /api/mode gateway fields optional (never block). Polls every 15s. */
export function useMode() {
  const [m, setM] = useState<ModeInfo | null>(null);
  useEffect(() => {
    const load = async () => {
      try {
        // Chip truth = /api/status alone. /api/mode is optional gateway metadata.
        const stRes = await fetch('/api/status', { cache: 'no-store' });
        if (!stRes.ok) throw new Error(`status ${stRes.status}`);
        const st = asStatus(await stRes.json());
        let gatewayAvailable = st.gatewayAvailable;
        let gatewayModel = st.gatewayModel;
        try {
          const mdRes = await fetch('/api/mode', { cache: 'no-store' });
          if (mdRes.ok) {
            const md = (await mdRes.json()) as Record<string, unknown>;
            if (!gatewayAvailable) gatewayAvailable = !!md.gatewayAvailable;
            if (!gatewayModel && typeof md.gatewayModel === 'string') gatewayModel = md.gatewayModel;
          }
        } catch {
          /* gateway fields optional — do not block chip */
        }
        setM({ ...st, gatewayAvailable, gatewayModel });
      } catch {
        setM({ ...MISSING });
      }
    };
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);
  return m;
}
export const useStatus = useMode;
export function isRemote(m: ModeInfo | null, preferRemote?: boolean) { return !!(preferRemote && m?.gatewayAvailable); }
const short = (s: string | null) => (s ? s.split('/').pop()!.replace(/\.gguf$/i, '').slice(0, 24) : '');
/** Header chip — never softened: LOCAL | STUB | REMOTE | MODEL MISSING. */
export function modeLabel(m: ModeInfo | null, preferRemote?: boolean) {
  if (!m) return { text: 'checking…', cls: 'border-zinc-800 text-zinc-500', who: 'Salomon' };
  if (isRemote(m, preferRemote)) return { text: `REMOTE${m.gatewayModel ? ` · ${short(m.gatewayModel)}` : ''}`, cls: 'border-zinc-600 text-zinc-200', who: `Salomon · REMOTE (${m.gatewayModel})` };
  switch (chipOf(m)) {
    case 'local': return { text: `LOCAL${m.model ? ` · ${short(m.model)}` : ''}`, cls: 'border-zinc-500 text-zinc-100', who: 'Salomon · LOCAL' };
    case 'stub': return { text: 'STUB', cls: 'border-zinc-600 text-zinc-300', who: 'Salomon · STUB' };
    default: return { text: 'MODEL MISSING', cls: 'border-zinc-500 bg-white/[0.04] text-zinc-200', who: 'Salomon' };
  }
}
