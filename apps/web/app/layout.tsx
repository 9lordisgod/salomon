import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/Shell';

export const metadata: Metadata = {
  title: 'Salomon — private local AI',
  description: 'A private local AI / personal research agent. Phase 3 M1 dogfood — web companion; on-device by default.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body className="antialiased"><AppShell>{children}</AppShell></body></html>
  );
}
