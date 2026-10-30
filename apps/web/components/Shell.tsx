'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { modeLabel, useMode } from '@/lib/useMode';
import { usePreferRemote } from '@/lib/preferRemote';
import { HistorySidebar } from './HistorySidebar';

/** M1: Research chat is the only nav surface. /sources (M2) and /approvals (M3) stay reachable by URL only. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const mode = useMode();
  const [preferRemote] = usePreferRemote();
  const b = modeLabel(mode, preferRemote);
  const [open, setOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const saved = localStorage.getItem('salomon.sidebar');
    setNarrow(mq.matches);
    setOpen(mq.matches ? false : saved !== '0');
    const on = (e: MediaQueryListEvent) => { setNarrow(e.matches); if (e.matches) setOpen(false); };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const toggle = () => setOpen((o) => { if (!narrow) localStorage.setItem('salomon.sidebar', o ? '0' : '1'); return !o; });

  return (
    <div className="flex min-h-screen bg-[#0e0f11] text-zinc-200">
      {/* Desktop: push rail. Mobile: overlay drawer. */}
      {open && narrow && <div className="fixed inset-0 z-30 bg-black/60" onClick={() => setOpen(false)} />}
      <aside
        className={`${narrow ? 'fixed inset-y-0 left-0 z-40 shadow-2xl' : 'sticky top-0 h-screen'} w-64 shrink-0 border-r border-white/[0.06] bg-[#0b0c0e] transition-[margin,transform] duration-200 ${
          open ? 'ml-0 translate-x-0' : narrow ? '-translate-x-full' : '-ml-64'
        }`}
      >
        <div className="flex h-14 items-center px-4 text-[13px] font-semibold tracking-tight text-zinc-300">Chats</div>
        <div className="h-[calc(100%-3.5rem)]"><HistorySidebar onPick={() => narrow && setOpen(false)} /></div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-white/[0.05] bg-[#0e0f11]/85 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4">
            <button
              type="button"
              onClick={toggle}
              aria-label={open ? 'Hide chat history' : 'Show chat history'}
              aria-expanded={open}
              className="rounded-lg px-2 py-1 text-[18px] leading-none text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100"
            >☰</button>
            <Link href="/" className="text-[16px] font-semibold tracking-tight text-zinc-100">Salomon</Link>
            <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-[12px] text-zinc-400">Research</span>
            <span title="Engine status (from /api/status)" className={`ml-auto truncate rounded-full border px-2.5 py-0.5 font-mono text-[10px] ${b.cls}`}>{b.text}</span>
          </div>
        </header>
        <main className="flex w-full flex-1 flex-col px-4 sm:px-6">{children}</main>
        <footer className="px-5 pb-3 text-center text-[11px] text-zinc-600">
          Local by default · REMOTE is always labeled · masking is a demo heuristic, not real source-ID masking until M2
        </footer>
      </div>
    </div>
  );
}
