import type { Metadata } from 'next';
import './globals.css';
import { AppShell } from '@/components/Shell';

export const metadata: Metadata = { title: 'Salomon — source-safe research', description: 'A local research agent for journalists that protects sources.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body className="antialiased"><AppShell>{children}</AppShell></body></html>
  );
}
