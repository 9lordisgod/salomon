'use client';
import { useEffect, useRef, useState } from 'react';
import { maskText } from '@/lib/mask';
import { useMaskMap, useNotes, useProposals } from '@/lib/store';
import { isRemote, modeLabel, useMode } from '@/lib/useMode';
import { usePreferRemote } from '@/lib/preferRemote';

type Msg = { id: string; role: 'user' | 'assistant'; text: string };

const SUGGESTIONS = [
  'Summarize what I know so far and flag gaps that need a second source.',
  'Draft three neutral right-of-reply questions.',
];

export default function Research() {
  const mode = useMode();
  const [preferRemote, setPreferRemote] = usePreferRemote();
  const remote = isRemote(mode, preferRemote);
  const label = modeLabel(mode, preferRemote);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState<'ready' | 'submitted' | 'streaming'>('ready');
  const [error, setError] = useState<Error | null>(null);
  const abort = useRef<AbortController | null>(null);
  const stop = () => abort.current?.abort();
  const [input, setInput] = useState('');
  const [map, setMap] = useMaskMap();
  const [notes, setNotes] = useNotes();
  const [proposals, setProposals] = useProposals();
  const [attach, setAttach] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const busy = status === 'submitted' || status === 'streaming';
  const end = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages]);
  useEffect(() => { inputRef.current?.focus(); }, []);

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
          patch(aid, () => 'Too long — trim notes (local ask cap is 8k until a separate notes field lands). Nothing was sent.');
          return;
        }
        const res = await fetch('/api/ask', { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: text }) });
        const j = await res.json().catch(() => ({ ok: false, reason: 'bad_response', message: `HTTP ${res.status}` }));
        patch(aid, () => (j.ok ? String(j.answer ?? '') : `Refused (${j.reason}): ${j.message}`));
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError(e as Error);
    } finally { setStatus('ready'); abort.current = null; }
  };
  const propose = (content: string, action: 'save' | 'export') =>
    setProposals([{ id: crypto.randomUUID(), action, title: content.slice(0, 60), content, status: 'pending', createdAt: new Date().toISOString() }, ...proposals]);
  const textOf = (m: Msg) => m.text;
  const overCap = attach && notes && (input.length + notes.length + 40) > 8000;

  const composer = (
    <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="rounded-2xl border border-white/10 bg-[#16171a] p-2 shadow-lg shadow-black/20 focus-within:border-white/20">
      <textarea
        ref={inputRef}
        value={input}
        rows={messages.length === 0 ? 3 : 2}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); } }}
        placeholder="Ask anything about your reporting…"
        className="block max-h-48 w-full resize-none bg-transparent px-2 py-2 text-[15px] text-zinc-100 outline-none placeholder:text-zinc-600"
      />
      {notesOpen && (
        <div className="mx-1 mb-2 rounded-xl border border-white/[0.06] bg-black/20 p-2">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 20000))}
            rows={4}
            placeholder="Paste interview notes here (masked before send)…"
            className="block w-full resize-none bg-transparent px-1 py-1 font-mono text-[12px] text-zinc-300 outline-none placeholder:text-zinc-600"
          />
          <label className="mt-1 flex items-center gap-1.5 px-1 text-[11px] text-zinc-500">
            <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} className="accent-zinc-400" />
            Attach on send ({notes.length} chars){overCap ? <span className="text-amber-400/80"> · over 8k — trim</span> : null}
          </label>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setNotesOpen((o) => !o)}
            className={`rounded-full px-2.5 py-1 text-[11px] ${notesOpen || (attach && notes) ? 'bg-white/[0.06] text-zinc-300' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Notes{notes ? ` · ${notes.length}` : ''}
          </button>
          <label
            title={mode?.gatewayAvailable ? 'Sends masked text to a cloud model. Not local.' : 'No gateway key configured'}
            className={`flex items-center gap-1.5 text-[11px] ${remote ? 'text-sky-400/80' : 'text-zinc-500'} ${mode?.gatewayAvailable ? '' : 'opacity-40'}`}
          >
            <input type="checkbox" disabled={!mode?.gatewayAvailable || busy} checked={remote} onChange={(e) => setPreferRemote(e.target.checked)} className="accent-sky-500" />
            REMOTE
          </label>
          {remote && <span className="text-[11px] text-sky-400/70">not local</span>}
        </div>
        {busy ? (
          <button type="button" onClick={() => stop()} className="rounded-full border border-white/15 px-3 py-1 text-[12px] text-zinc-200">Stop</button>
        ) : (
          <button disabled={!input.trim()} className="rounded-full bg-zinc-100 px-3.5 py-1 text-[12px] font-medium text-zinc-900 disabled:opacity-30">Send</button>
        )}
      </div>
    </form>
  );

  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-7rem)] max-w-3xl flex-col">
      <div className={`flex-1 ${messages.length === 0 ? 'flex flex-col justify-center pb-8' : 'pb-44'}`}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-medium tracking-tight text-zinc-100">What are you reporting on?</h1>
            <p className="mt-2 max-w-sm text-[13px] text-zinc-500">Type a question. Answers stay local unless you turn on REMOTE.</p>
            <div className="mt-8 w-full max-w-xl text-left">{composer}</div>
            <div className="mt-4 flex w-full max-w-xl flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  disabled={busy}
                  className="rounded-full border border-white/[0.07] px-3 py-1.5 text-left text-[12px] text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"
                >
                  {s}
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
                  <div className={`whitespace-pre-wrap text-[15px] leading-7 ${refused ? 'text-amber-300/90' : 'text-zinc-200'}`}>{shown}</div>
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
            {error && <p className="text-[13px] text-red-400/90">Request failed. Nothing was saved or sent. {error.message}</p>}
            <div ref={end} />
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <div className="sticky bottom-0 -mx-2 bg-gradient-to-t from-[#0e0f11] via-[#0e0f11] to-transparent px-2 pb-4 pt-6">
          {composer}
        </div>
      )}
    </div>
  );
}
