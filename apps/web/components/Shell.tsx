'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { modeLabel, useMode } from '@/lib/useMode';

const NAV = [
  { href: '/', label: 'Research' },
  { href: '/sources', label: 'Sources' },
  { href: '/approvals', label: 'Approvals' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const mode = useMode();
  const b = modeLabel(mode);
  return (
    <div className="min-h-screen bg-[#08090b] text-zinc-200">
      <header className="sticky top-0 z-10 border-b border-zinc-800/80 bg-[#0b0c0f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-3.5">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-2xl tracking-tight text-zinc-50">Salomon</span>
            <span className="hidden text-[10px] uppercase tracking-[0.25em] text-zinc-500 sm:inline">Local research · Phase 3 M1</span>
          </div>
          <nav className="flex gap-1">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={`px-3 py-1.5 text-sm transition ${path === n.href ? 'border-b-2 border-red-700 text-zinc-50' : 'border-b-2 border-transparent text-zinc-400 hover:text-zinc-100'}`}>{n.label}</Link>
            ))}
          </nav>
          <span className={`ml-auto rounded border px-2 py-1 font-mono text-[11px] ${b.cls}`}>{b.text}</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      <footer className="mx-auto max-w-6xl border-t border-zinc-900 px-6 py-6 text-xs leading-relaxed text-zinc-600">
        Dogfood build. A real on-device model is always preferred; REMOTE GATEWAY mode sends masked text to a cloud model and is always labeled — never a silent cloud fallback.
        Masking is a demo heuristic, not a guarantee (M2). Save/export approvals are M3 placeholders. Credentials are stripped before any model.
      </footer>
    </div>
  );
}
