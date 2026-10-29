'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV = [
  { href: '/', label: 'Research' },
  { href: '/sources', label: 'Sources' },
  { href: '/approvals', label: 'Approvals' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [mode, setMode] = useState<{ mode: string; model: string | null } | null>(null);
  useEffect(() => { fetch('/api/mode').then((r) => r.json()).then(setMode).catch(() => {}); }, []);
  return (
    <div className="min-h-screen bg-[#0b0d10] text-zinc-200">
      <header className="border-b border-zinc-800 bg-[#0e1115]">
        <div className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-4">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-xl tracking-tight text-zinc-50">Salomon</span>
            <span className="hidden text-xs uppercase tracking-[0.2em] text-zinc-500 sm:inline">Source-safe research</span>
          </div>
          <nav className="flex gap-1">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={`rounded px-3 py-1.5 text-sm ${path === n.href ? 'bg-zinc-800 text-zinc-50' : 'text-zinc-400 hover:text-zinc-100'}`}>{n.label}</Link>
            ))}
          </nav>
          <div className="ml-auto text-xs">
            {mode?.mode === 'local' ? (
              <span className="rounded border border-emerald-700/60 bg-emerald-950/40 px-2 py-1 text-emerald-300">LOCAL · offline · runs on your machine</span>
            ) : mode?.mode === 'gateway' ? (
              <span className="rounded border border-sky-700/60 bg-sky-950/40 px-2 py-1 text-sky-300">DEMO · remote · {mode.model} · not local</span>
            ) : (
              <span className="rounded border border-amber-700/60 bg-amber-950/40 px-2 py-1 text-amber-300">DEMO MODE · stub model · not local</span>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      <footer className="mx-auto max-w-6xl px-6 pb-8 text-xs text-zinc-600">
        UX dogfood build. Research desk asks go to the offline <code>/api/ask</code> path (Phase 3 M1); if no local model is installed it refuses — never a silent cloud fallback. Masking is a demo heuristic, not a guarantee. Credentials never enter model context.
      </footer>
    </div>
  );
}
