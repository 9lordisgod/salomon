'use client';
import { useEffect, useState } from 'react';
export type ModeInfo = { mode: 'local' | 'gateway' | 'stub' | 'demo'; model: string | null };
export function useMode() {
  const [m, setM] = useState<ModeInfo | null>(null);
  useEffect(() => { fetch('/api/mode').then((r) => r.json()).then(setM).catch(() => {}); }, []);
  return m;
}
export function modeLabel(m: ModeInfo | null) {
  switch (m?.mode) {
    case 'local': return { text: `LOCAL · on-device · ${m.model}`, cls: 'border-emerald-900/60 text-emerald-400/80', who: 'Salomon · local' };
    case 'gateway': return { text: `DEMO · REMOTE · ${m.model} · not local`, cls: 'border-sky-900/60 text-sky-400/80', who: `Salomon · remote (${m.model})` };
    case 'stub': return { text: 'DEMO · stub · not a local model', cls: 'border-amber-900/60 text-amber-400/80', who: 'Salomon · stub' };
    case 'demo': return { text: 'DEMO · no model connected', cls: 'border-amber-900/60 text-amber-400/80', who: 'Salomon · demo' };
    default: return { text: 'checking…', cls: 'border-zinc-800 text-zinc-500', who: 'Salomon' };
  }
}
