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

// ---- Chat threads (localStorage, synced across components via a window event) ----
export type ThreadMsg = { id: string; role: 'user' | 'assistant'; text: string };
export type Thread = { id: string; title: string; updatedAt: string; messages: ThreadMsg[] };
const TKEY = 'salomon.threads', AKEY = 'salomon.activeThread', EVT = 'salomon-threads';

function readThreads(): Thread[] { try { return JSON.parse(localStorage.getItem(TKEY) || '[]'); } catch { return []; } }
function readActive(): string | null { return localStorage.getItem(AKEY); }
function emit() { window.dispatchEvent(new Event(EVT)); }

export const threadTitle = (ms: ThreadMsg[]) => {
  const u = ms.find((m) => m.role === 'user');
  const t = (u?.text ?? 'New chat').split('\n\n--- Notes (untrusted data) ---')[0].replace(/\s+/g, ' ').trim();
  return t.length > 60 ? t.slice(0, 57) + '…' : t || 'New chat';
};

export function saveThread(id: string, messages: ThreadMsg[]) {
  if (!messages.length) return;
  const rest = readThreads().filter((t) => t.id !== id);
  const t: Thread = { id, title: threadTitle(messages), updatedAt: new Date().toISOString(), messages };
  localStorage.setItem(TKEY, JSON.stringify([t, ...rest].slice(0, 100)));
  localStorage.setItem(AKEY, id);
  emit();
}
export function setActiveThread(id: string | null) {
  if (id) localStorage.setItem(AKEY, id); else localStorage.removeItem(AKEY);
  emit();
}
export function deleteThread(id: string) {
  localStorage.setItem(TKEY, JSON.stringify(readThreads().filter((t) => t.id !== id)));
  if (readActive() === id) localStorage.removeItem(AKEY);
  emit();
}

export function useThreads() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => { setThreads(readThreads()); setActiveId(readActive()); setReady(true); };
    sync();
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener('storage', sync); };
  }, []);
  return { threads, activeId, ready };
}
