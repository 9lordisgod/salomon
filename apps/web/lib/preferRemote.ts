'use client';
import { useCallback, useEffect, useState } from 'react';
const KEY = 'salomon-prefer-remote';
const EVT = 'salomon-prefer-remote-change';
/** Explicit user opt-in to REMOTE gateway. Default false (local). */
export function usePreferRemote(): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(false);
  useEffect(() => {
    const read = () => { try { setV(localStorage.getItem(KEY) === '1'); } catch {} };
    read();
    window.addEventListener(EVT, read); window.addEventListener('storage', read);
    return () => { window.removeEventListener(EVT, read); window.removeEventListener('storage', read); };
  }, []);
  const set = useCallback((nv: boolean) => {
    try { localStorage.setItem(KEY, nv ? '1' : '0'); } catch {}
    setV(nv); window.dispatchEvent(new Event(EVT));
  }, []);
  return [v, set];
}
