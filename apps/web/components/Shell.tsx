'use client';
import Link from 'next/link';
import { modeLabel, useMode } from '@/lib/useMode';
import { usePreferRemote } from '@/lib/preferRemote';

/** M1: Research chat is the only nav surface. /sources (M2) and /approvals (M3) stay reachable by URL. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const mode = useMode();
  const [preferRemote] = usePreferRemote();
  const b = modeLabel(mode, preferRemote);
  return (
    <div className="flex min-h-screen flex-col bg-[#0e0f11] text-zinc-200">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0e0f11]/90 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-3xl items-center gap-3 px-5">
          <Link href="/" className="text-[15px] font-semibold tracking-tight text-zinc-100">
            Salomon
          </Link>
          <span className="text-[12px] text-zinc-600">Research</span>
          <span title="Engine mode" className={`ml-auto truncate rounded-full border px-2 py-0.5 font-mono text-[10px] ${b.cls}`}>
            {b.text}
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-6">{children}</main>
      <footer className="mx-auto w-full max-w-3xl px-5 pb-3 text-center text-[11px] text-zinc-600">
        Local by default · REMOTE is always labeled · masking is a demo heuristic
      </footer>
    </div>
  );
}
