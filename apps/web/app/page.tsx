'use client';
import { useEffect, useRef, useState } from 'react';
import { maskText } from '@/lib/mask';
import { saveThread, useMaskMap, useNotes, useProposals, useThreads } from '@/lib/store';
import { chipOf, isRemote, modeLabel, useMode } from '@/lib/useMode';
import { usePreferRemote } from '@/lib/preferRemote';

type Msg = { id: string; role: 'user' | 'assistant'; text: string };

const SUGGESTIONS = [
  { t: 'Find the gaps', q: 'Summarize what I know so far and flag gaps that need a second source.' },
  { t: 'Right of reply', q: 'Draft three neutral right-of-reply questions.' },
  { t: 'Build a timeline', q: 'Turn my notes into a dated timeline and mark anything unverified.' },
  { t: 'Stress-test a claim', q: 'What would I need to verify before publishing this claim?' },
];

export default function Research() {
  const mode = useMode();
  const [preferRemote, setPreferRemote] = usePreferRemote();
  const remote = isRemote(mode, preferRemote);
  const label = modeLabel(mode, preferRemote);
  const missing = !!mode && !remote && chipOf(mode) === 'missing';
  const [maskOpen, setMaskOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState<'ready' | 'submitted' | 'streaming'>('ready');
  const [error, setError] = useState<Error | null>(null);
  const abort = useRef<AbortController | null>(null);
  const messagesRef = useRef<Msg[]>([]);
  // Abort in-flight ask and drop orphan empty assistant (no leftover "Thinking…").
  const cancelInFlight = () => {
    if (abort.current) { abort.current.abort(); abort.current = null; }
    setStatus('ready');
    setError(null);
    const ms = messagesRef.current;
    const last = ms[ms.length - 1];
    if (last?.role === 'assistant' && !last.text.trim()) {
      const pruned = ms.slice(0, -1);
      messagesRef.current = pruned;
      setMessages(pruned);
      if (threadId.current && pruned.length) saveThread(threadId.current, pruned);
    }
  };
  const stop = () => cancelInFlight();
  const [input, setInput] = useState('');
  const [map, setMap] = useMaskMap();
  const [notes, setNotes] = useNotes();
  const [proposals, setProposals] = useProposals();
  const [attach, setAttach] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const busy = status === 'submitted' || status === 'streaming';
  const end = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadId = useRef<string>('');
  messagesRef.current = messages;
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Threads: auto-save current conversation; load when picked in the sidebar; clear on New chat.
  // Abort any in-flight ask on New chat / thread switch so we never leave orphan Thinking….
  const { activeId, ready } = useThreads();
  useEffect(() => {
    if (!ready) return;
    if (activeId === threadId.current) return;
    cancelInFlight();
    if (!activeId) {
      threadId.current = '';
      setMessages([]);
      messagesRef.current = [];
      inputRef.current?.focus();
      return;
    }
    const t = JSON.parse(localStorage.getItem('salomon.threads') || '[]').find((x: { id: string }) => x.id === activeId);
    threadId.current = activeId;
    const ms = (t?.messages ?? []) as Msg[];
    setMessages(ms);
    messagesRef.current = ms;
  }, [activeId, ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (status !== 'ready' || messages.length === 0) return;
    if (!threadId.current) threadId.current = crypto.randomUUID();
    saveThread(threadId.current, messages);
  }, [messages, status]);

  const ask = (q: string) => {
    if (!q.trim() || busy) return;
    const raw = attach && notes ? `${q}\n\n--- Notes (untrusted data) ---\n${notes}` : q;
    const { text, map: m } = maskText(raw, map);
    setMap(m);
    setInput('');
    void send(text);
  };
  const patch = (id: string, f: (t: string) => string) => setMessages((ms) => ms.map((x) => (x.id === id ? { ...x, text: f(x.text) } : x)));

  // Default: local POST /api/ask (Runtime askLocal, fail closed). REMOTE gateway only on explicit opt-in.
  const send = async (text: string) => {
    const uid = crypto.randomUUID(), aid = crypto.randomUUID();
    const history = messages;
    setMessages((ms) => [...ms, { id: uid, role: 'user', text }, { id: aid, role: 'assistant', text: '' }]);
    setError(null); setStatus('submitted');
    const ac = new AbortController(); abort.current = ac;
    try {
      if (remote) {
        const ui = [...history, { id: uid, role: 'user' as const, text }].map((m) => ({ id: m.id, role: m.role, parts: [{ type: 'text', text: m.text }] }));
        const res = await fetch('/api/chat', { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', 'x-salomon-remote': '1' }, body: JSON.stringify({ messages: ui }) });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        setStatus('streaming');
        const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
        for (;;) {
          const { done, value } = await reader.read(); if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n'); buf = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const d = line.slice(5).trim(); if (!d || d === '[DONE]') continue;
            try {
              const ev = JSON.parse(d);
              if (ev.type === 'text-delta') patch(aid, (t) => t + (ev.delta ?? ''));
              else if (ev.type === 'error') patch(aid, (t) => t + (t ? '\n\n' : '') + (ev.errorText ?? 'REMOTE GATEWAY error'));
            } catch {}
          }
        }
      } else {
        // askLocal questionMax ~8k; never silently drop attached notes (Runtime preferred: separate notes field later).
        if (text.length > 8000) {
          patch(aid, () => 'Refused (notes_too_long): Too long — trim notes (local ask cap is 8k until a separate notes field lands). Nothing was sent.');
          return;
        }
        const res = await fetch('/api/ask', { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: text }) });
        const j = await res.json().catch(() => ({ ok: false, reason: 'bad_response', message: `HTTP ${res.status}` }));
        patch(aid, () => (j.ok ? String(j.answer ?? '') : `Refused (${j.reason ?? 'refused'}): ${j.message ?? ''}`));
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        setMessages((ms) => {
          const last = ms[ms.length - 1];
          const pruned = last?.role === 'assistant' && !last.text.trim() ? ms.slice(0, -1) : ms;
          messagesRef.current = pruned;
          return pruned;
        });
      } else setError(e as Error);
    } finally { setStatus('ready'); abort.current = null; }
  };
  const propose = (content: string, action: 'save' | 'export') =>
    setProposals([{ id: crypto.randomUUID(), action, title: content.slice(0, 60), content, status: 'pending', createdAt: new Date().toISOString() }, ...proposals]);
  const textOf = (m: Msg) => m.text;
  const overCap = attach && notes && (input.length + notes.length + 40) > 8000;

  const composer = (
    <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="w-full rounded-3xl border border-white/10 bg-[#17181b] p-3 shadow-xl shadow-black/30 ring-1 ring-black/20 transition-colors focus-within:border-white/20">
      <textarea
        ref={inputRef}
        value={input}
        rows={messages.length === 0 ? 4 : 2}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); } }}
        placeholder="Ask anything about your reporting…"
        className={`block max-h-60 w-full resize-none bg-transparent px-3 py-2 text-[16px] leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-500 ${messages.length === 0 ? 'min-h-[7rem]' : 'min-h-[3.25rem]'}`}
      />
      {notesOpen && (
        <div className="mx-1 mb-2 rounded-xl border border-white/[0.06] bg-black/20 p-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 20000))}
            rows={4}
            placeholder="Paste interview notes here (demo masking before send — not real source-ID masking until M2)…"
            className="block w-full resize-none bg-transparent px-1 py-1 font-mono text-[12px] text-zinc-300 outline-none placeholder:text-zinc-600"
          />
          <label className="mt-1 flex items-center gap-1.5 px-1 text-[11px] text-zinc-500">
            <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} className="accent-zinc-400" />
            Attach on send ({notes.length} chars){overCap ? <span className="text-zinc-400"> · over 8k — trim</span> : null}
          </label>
        </div>
      )}
      {maskOpen && map.length > 0 && (
        <div className="mx-1 mb-2 max-h-48 overflow-auto rounded-xl border border-white/[0.06] bg-black/20 p-2 text-[11px]">
          <p className="mb-1.5 text-zinc-500">Demo heuristic until M2 — not real source-ID masking. Tokens stay on this device.</p>
          <ul className="space-y-0.5 font-mono">
            {map.map((e) => (<li key={e.token} className="flex gap-2"><span className="text-zinc-300">{e.token}</span><span className="text-zinc-600">{e.kind}</span></li>))}
          </ul>
        </div>
      )}
      <div className="mt-1 flex items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setNotesOpen((o) => !o)}
            className={`rounded-full px-2.5 py-1 text-[11px] ${notesOpen || (attach && notes) ? 'bg-white/[0.06] text-zinc-300' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Notes{notes ? ` · ${notes.length}` : ''}
          </button>
          <button
            type="button"
            onClick={() => setMaskOpen((o) => !o)}
            disabled={map.length === 0}
            title="Demo heuristic until M2 — not real source-ID masking"
            className={`rounded-full px-2.5 py-1 text-[11px] ${maskOpen ? 'bg-white/[0.06] text-zinc-300' : 'text-zinc-500 hover:text-zinc-300'} disabled:opacity-40`}
          >
            Mask map · {map.length} <span className="text-zinc-600">(demo)</span>
          </button>
          <label
            title={mode?.gatewayAvailable ? 'Sends masked text to a cloud model. Not local.' : 'No gateway key configured'}
            className={`flex items-center gap-1.5 text-[11px] ${remote ? 'text-zinc-200' : 'text-zinc-500'} ${mode?.gatewayAvailable ? '' : 'opacity-40'}`}
          >
            <input type="checkbox" disabled={!mode?.gatewayAvailable || busy} checked={remote} onChange={(e) => setPreferRemote(e.target.checked)} className="accent-zinc-400" />
            REMOTE
          </label>
          {remote && <span className="text-[11px] text-zinc-400">not local</span>}
        </div>
        {busy ? (
          <button type="button" onClick={() => stop()} aria-label="Stop" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-[12px] text-zinc-200">■</button>
        ) : (
          <button disabled={!input.trim()} aria-label="Send" className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-[16px] font-semibold text-zinc-900 transition-opacity hover:bg-white disabled:opacity-25">↑</button>
        )}
      </div>
    </form>
  );

  return (
    <div className="relative mx-auto flex w-full max-w-[46rem] flex-1 flex-col">
      <div className={`flex-1 ${messages.length === 0 ? 'flex flex-col justify-center pb-16 pt-8' : 'pb-48 pt-6'}`}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-zinc-400">🔒 Local-first research desk</div>
            <h1 className="text-[2rem] font-semibold tracking-tight text-zinc-50 sm:text-[2.25rem]">What are you reporting on?</h1>
            <p className="mt-3 max-w-md text-[14px] leading-relaxed text-zinc-400">Ask about your story. Answers stay on this machine unless you switch on REMOTE. Names in notes may be masked before send — a <span className="text-zinc-300">demo heuristic, not real source-ID masking until M2</span>.</p>
            {missing && (
              <div role="status" className="mt-7 w-full rounded-2xl border border-zinc-600 bg-white/[0.03] px-4 py-3 text-left">
                <div className="font-mono text-[11px] uppercase tracking-wide text-zinc-300">Model missing</div>
                <p className="mt-1 text-[14px] leading-6 text-zinc-300">Local model missing. Install GGUF (SALOMON_GGUF) or explicitly enable labeled REMOTE.</p>
              </div>
            )}
            <div className="mt-9 w-full text-left">{composer}</div>
            <div className="mt-5 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.t}
                  type="button"
                  onClick={() => ask(s.q)}
                  disabled={busy}
                  className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-left shadow-sm shadow-black/20 transition-colors hover:border-white/15 hover:bg-white/[0.05]"
                >
                  <div className="text-[13px] font-medium text-zinc-200">{s.t}</div>
                  <div className="mt-0.5 text-[12px] leading-snug text-zinc-500">{s.q}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8 pt-2">
            {messages.map((m) => {
              const text = textOf(m);
              const user = m.role === 'user';
              const shown = user ? text.split('\n\n--- Notes (untrusted data) ---')[0] : text;
              const refused = !user && /^(Refused|I won't|Too long)/.test(text);
              return user ? (
                <div key={m.id} className="flex flex-col items-end">
                  <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-white/[0.06] px-4 py-2.5 text-[15px] leading-relaxed text-zinc-100">{shown}</div>
                  <div className="mt-1 text-[10px] text-zinc-600">as sent, masked{text.includes('--- Notes') ? ' · notes attached' : ''}</div>
                </div>
              ) : (
                <article key={m.id}>
                  <div className="mb-1.5 text-[11px] text-zinc-500">{label.who}</div>
                  {refused ? (
                    <div role="alert" className="rounded-xl border border-zinc-600 bg-white/[0.03] px-4 py-3 text-zinc-300">
                      <div className="font-mono text-[11px] uppercase tracking-wide text-zinc-300">Refused{(/^Refused \(([^)]+)\)/.exec(shown)?.[1]) ? ` · ${/^Refused \(([^)]+)\)/.exec(shown)![1]}` : ''}</div>
                      <div className="mt-1 whitespace-pre-wrap text-[14px] leading-6">{shown.replace(/^Refused \([^)]+\):\s*/, '')}</div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-200">{shown}</div>
                  )}
                  {!busy && !refused && text && (
                    <div className="mt-2 flex gap-3 text-[12px] text-zinc-600">
                      <button type="button" onClick={() => propose(text, 'save')} className="hover:text-zinc-300">Propose save</button>
                      <button type="button" onClick={() => propose(text, 'export')} className="hover:text-zinc-300">Propose export</button>
                    </div>
                  )}
                </article>
              );
            })}
            {status === 'submitted' && <p className="animate-pulse text-[13px] text-zinc-500">Thinking…</p>}
            {error && <p className="text-[13px] text-zinc-300">Request failed. Nothing was saved or sent. {error.message}</p>}
            <div ref={end} />
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <div className="sticky bottom-0 -mx-2 bg-gradient-to-t from-[#0e0f11] via-[#0e0f11] to-transparent px-2 pb-3 pt-8">
          {composer}
        </div>
      )}
    </div>
  );
}
