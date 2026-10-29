'use client';
import { useState } from 'react';
import { maskText } from '@/lib/mask';
import { useMaskMap, useNotes, useProposals } from '@/lib/store';

export default function Research() {
  type Msg = { id: string; role: 'user' | 'assistant' | 'refuse'; text: string; code?: string };
  const [messages, setMessages] = useState<Msg[]>([]);
  const [status, setStatus] = useState<'ready' | 'submitted'>('ready');
  const [error, setError] = useState(false);
  const [input, setInput] = useState('');
  const [map, setMap] = useMaskMap();
  const [notes] = useNotes();
  const [proposals, setProposals] = useProposals();
  const [attach, setAttach] = useState(true);
  const busy = status === 'submitted';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const raw = attach && notes ? `${input}\n\n--- Notes (untrusted data) ---\n${notes}` : input;
    const { text, map: m } = maskText(raw, map);
    setMap(m);
    setInput(''); setError(false); setStatus('submitted');
    setMessages((ms) => [...ms, { id: crypto.randomUUID(), role: 'user', text }]);
    try {
      const res = await fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question: text }) });
      const j = await res.json();
      setMessages((ms) => [...ms, j.ok ? { id: crypto.randomUUID(), role: 'assistant', text: j.answer } : { id: crypto.randomUUID(), role: 'refuse', text: j.message, code: j.reason }]);
    } catch { setError(true); } finally { setStatus('ready'); }
  };

  const propose = (content: string, action: 'save' | 'export') =>
    setProposals([{ id: crypto.randomUUID(), action, title: content.slice(0, 60), content, status: 'pending', createdAt: new Date().toISOString() }, ...proposals]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <section>
        <h1 className="font-serif text-3xl text-zinc-50">Research desk</h1>
        <p className="mt-1 text-sm text-zinc-400">Ask about your notes. Names, emails, phones, and handles are masked in your browser before anything is sent.</p>
        <div className="mt-6 min-h-[360px] space-y-4 rounded-lg border border-zinc-800 bg-[#0e1115] p-5">
          {messages.length === 0 && <p className="text-sm text-zinc-500">Try: “Summarize the timeline from my notes and list what still needs a second source.”</p>}
          {messages.map((m) => {
            const text = m.text;
            return (
              <div key={m.id} className={m.role === 'user' ? 'border-l-2 border-zinc-600 pl-4' : m.role === 'refuse' ? 'border-l-2 border-amber-600 pl-4' : 'border-l-2 border-emerald-700 pl-4'}>
                <div className="text-[11px] uppercase tracking-widest text-zinc-500">{m.role === 'user' ? 'You (as sent, masked)' : m.role === 'refuse' ? <>Salomon refused <code className="normal-case text-zinc-600">{m.code}</code></> : 'Salomon · local'}</div>
                <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{text}</div>
                {m.role === 'assistant' && !busy && (
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => propose(text, 'save')} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800">Propose save</button>
                    <button onClick={() => propose(text, 'export')} className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800">Propose export</button>
                  </div>
                )}
              </div>
            );
          })}
          {status === 'submitted' && <p className="text-xs text-zinc-500">Thinking…</p>}
          {error && <p className="text-sm text-red-400">Request failed. Nothing was saved or sent.</p>}
        </div>
        <form onSubmit={submit} className="mt-4 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a research question…" className="flex-1 rounded border border-zinc-700 bg-[#0e1115] px-4 py-3 text-sm outline-none focus:border-zinc-500" />
          {busy ? <button type="button" disabled className="rounded bg-zinc-700 px-5 text-sm">Asking…</button>
            : <button className="rounded bg-zinc-100 px-5 text-sm font-medium text-zinc-900 hover:bg-white">Ask</button>}
        </form>
        <label className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
          <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} /> Attach notes from Sources ({notes.length} chars, masked)
        </label>
      </section>
      <aside className="space-y-4 text-sm">
        <Card title="Protections">
          <li>Source identity masked before send</li><li>Secrets stripped server-side</li><li>Model can only propose; you approve</li><li>No keys in browser or model context</li>
        </Card>
        <Card title={`Mask map (${map.length})`}>
          {map.length === 0 ? <li className="text-zinc-500">Nothing masked yet</li> : map.slice(0, 8).map((e) => <li key={e.token}><code className="text-emerald-400">{e.token}</code></li>)}
        </Card>
        <Card title="Pending approvals"><li>{proposals.filter((p) => p.status === 'pending').length} waiting</li></Card>
      </aside>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-[#0e1115] p-4">
      <div className="mb-2 text-[11px] uppercase tracking-widest text-zinc-500">{title}</div>
      <ul className="space-y-1 text-zinc-300">{children}</ul>
    </div>
  );
}
