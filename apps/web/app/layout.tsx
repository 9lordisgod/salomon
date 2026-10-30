import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/Shell';

export const metadata: Metadata = {
  title: 'Salomon — local research for journalists',
  description: 'A local research agent for journalists and investigators. Phase 3 M1 dogfood — masking is a demo heuristic until M2.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body className="antialiased"><AppShell>{children}</AppShell></body></html>
  );
}
