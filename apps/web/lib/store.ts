'use client';
import { useEffect, useState } from 'react';
import type { MaskEntry } from './mask';

export type Proposal = { id: string; action: 'save' | 'export'; title: string; content: string; status: 'pending' | 'approved' | 'denied'; createdAt: string };

function useLocal<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(initial);
  useEffect(() => { const s = localStorage.getItem(key); if (s) setV(JSON.parse(s)); }, [key]);
  const set = (n: T) => { setV(n); localStorage.setItem(key, JSON.stringify(n)); };
  return [v, set] as const;
}
export const useMaskMap = () => useLocal<MaskEntry[]>('salomon.maskmap', []);
export const useNotes = () => useLocal<string>('salomon.notes', '');
export const useProposals = () => useLocal<Proposal[]>('salomon.proposals', []);
