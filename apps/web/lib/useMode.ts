'use client';
import { useEffect, useState } from 'react';
export type Chip = 'local' | 'stub' | 'missing';
export type ModeInfo = {
  available: boolean; backend: 'gguf' | 'transformers' | 'stub' | 'none'; model: string | null;
  masking: 'demo' | 'real'; mode: 'local' | 'stub' | 'demo'; chip?: Chip;
  gatewayAvailable: boolean; gatewayModel: string | null;
};
/** Server chip; derive from Runtime fields if chip is absent. */
export function chipOf(m: ModeInfo): Chip {
  if (m.chip) return m.chip;
  if (m.backend === 'stub') return 'stub';
  return m.available ? 'local' : 'missing';
}
/** Fetches /api/status on load and polls every 15s. */
export function useMode() {
  const [m, setM] = useState<ModeInfo | null>(null);
  useEffect(() => {
    // /api/status (Runtime) = engine truth; gateway fields come from /api/mode (REMOTE is client opt-in only).
    const load = () => Promise.all([
      fetch('/api/status', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/mode', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
    ]).then(([st, md]) => setM({ ...st, gatewayAvailable: st.gatewayAvailable ?? !!md.gatewayAvailable, gatewayModel: st.gatewayModel ?? md.gatewayModel ?? null })).catch(() => {});
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
  if (isRemote(m, preferRemote)) return { text: `REMOTE${m.gatewayModel ? ` · ${short(m.gatewayModel)}` : ''}`, cls: 'border-sky-900/60 text-sky-400', who: `Salomon · REMOTE (${m.gatewayModel})` };
  switch (chipOf(m)) {
    case 'local': return { text: `LOCAL${m.model ? ` · ${short(m.model)}` : ''}`, cls: 'border-emerald-900/60 text-emerald-400', who: 'Salomon · LOCAL' };
    case 'stub': return { text: 'STUB', cls: 'border-amber-900/60 text-amber-400', who: 'Salomon · STUB' };
    default: return { text: 'MODEL MISSING', cls: 'border-amber-700/70 bg-amber-500/10 text-amber-300', who: 'Salomon' };
  }
}
