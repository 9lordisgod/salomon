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
    case 'local': return { text: `LOCAL · on-device · ${m.model}`, cls: 'border-emerald-700/60 bg-emerald-950/40 text-emerald-300', who: 'Salomon · local' };
    case 'gateway': return { text: `DEMO · REMOTE · ${m.model} · not local`, cls: 'border-sky-700/60 bg-sky-950/40 text-sky-300', who: `Salomon · remote (${m.model})` };
    case 'stub': return { text: 'DEMO · stub · not a local model', cls: 'border-amber-700/60 bg-amber-950/40 text-amber-300', who: 'Salomon · stub' };
    case 'demo': return { text: 'DEMO · no model connected', cls: 'border-amber-700/60 bg-amber-950/40 text-amber-300', who: 'Salomon · demo' };
    default: return { text: 'checking…', cls: 'border-zinc-700 text-zinc-500', who: 'Salomon' };
  }
}
