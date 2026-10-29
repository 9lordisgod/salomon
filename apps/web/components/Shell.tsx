'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { modeLabel, useMode } from '@/lib/useMode';
import { usePreferRemote } from '@/lib/preferRemote';

const NAV = [
  { href: '/', label: 'Research' },
  { href: '/sources', label: 'Sources' },
  { href: '/approvals', label: 'Approvals' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const mode = useMode();
  const [preferRemote] = usePreferRemote();
  const b = modeLabel(mode, preferRemote);
  return (
    <div className="flex min-h-screen flex-col bg-[#0e0f11] text-zinc-200">
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#0e0f11]/90 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-5xl items-center gap-6 px-5">
          <span className="text-[15px] font-semibold tracking-tight text-zinc-100">Salomon</span>
          <nav className="flex gap-0.5">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={`rounded-md px-2.5 py-1 text-[13px] transition ${path === n.href ? 'bg-white/[0.06] text-zinc-100' : 'text-zinc-500 hover:text-zinc-200'}`}>{n.label}</Link>
            ))}
          </nav>
          <span title="Engine mode" className={`ml-auto truncate rounded-full border px-2 py-0.5 font-mono text-[10px] ${b.cls}`}>{b.text}</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">{children}</main>
      <footer className="mx-auto w-full max-w-3xl px-5 pb-4 text-center text-[11px] leading-relaxed text-zinc-600">
        Dogfood · Phase 3 M1. REMOTE mode sends masked text to a cloud model and is always labeled — no silent cloud fallback.
        Masking is a demo heuristic, not a guarantee. Approvals are M3 placeholders.
      </footer>
    </div>
  );
}
