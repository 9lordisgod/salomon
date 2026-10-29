'use client';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { maskText } from '@/lib/mask';
import { useMaskMap, useNotes, useProposals } from '@/lib/store';
import { modeLabel, useMode } from '@/lib/useMode';

const SAMPLE_NOTES = `Interview log — municipal water contract (draft, unverified)
Mar 3: Call with source codename Heron (whistleblower, procurement office). Says bid for Riverside pumping contract was rewritten after deadline.
Mar 5: Heron emailed scan of bid sheet from heron.tips@protonmail.com. Phone on file: 604-555-0182.
Mar 9: Spoke to Maria Lopez (former council aide). Confirms deputy director Daniel Reyes met the winning bidder twice in February. On background only.
Mar 12: Public records: contract awarded Feb 28 for $4.2M, 18% above runner-up. Council minutes show no discussion.
Open: second source for the rewrite claim; Reyes has not responded to request for comment (@dreyes_city).`;

const SUGGESTIONS = [
  'Summarize the timeline and flag every claim that still needs a second source.',
  'Draft three neutral questions for the right-of-reply request.',
  'What public records could independently corroborate the bid rewrite?',
];

export default function Research() {
  const mode = useMode();
  const label = modeLabel(mode);
  const { messages, sendMessage, status, stop, error } = useChat({ transport: new DefaultChatTransport({ api: '/api/chat' }) });
  const [input, setInput] = useState('');
  const [map, setMap] = useMaskMap();
  const [notes, setNotes] = useNotes();
  const [proposals, setProposals] = useProposals();
  const [attach, setAttach] = useState(true);
  const busy = status === 'submitted' || status === 'streaming';
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages]);

  const ask = (q: string) => {
    if (!q.trim() || busy) return;
    const raw = attach && notes ? `${q}\n\n--- Notes (untrusted data) ---\n${notes}` : q;
    const { text, map: m } = maskText(raw, map);
    setMap(m);
    setInput('');
    sendMessage({ text });
  };
  const propose = (content: string, action: 'save' | 'export') =>
    setProposals([{ id: crypto.randomUUID(), action, title: content.slice(0, 60), content, status: 'pending', createdAt: new Date().toISOString() }, ...proposals]);
  const textOf = (m: (typeof messages)[number]) => m.parts.map((p) => (p.type === 'text' ? p.text : '')).join('');

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
      <section>
        <div className="text-[10px] uppercase tracking-[0.3em] text-red-500/80">Research desk</div>
        <h1 className="mt-1 font-serif text-4xl text-zinc-50">Ask about your reporting</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Names, emails, phones and handles are masked in your browser before sending. Masking is a <strong className="text-zinc-300">demo heuristic, not a guarantee</strong> (M2).
          Current engine: <span className="font-mono text-zinc-300">{label.text}</span>.
        </p>

        {!notes && (
          <div className="mt-6 flex items-center justify-between gap-4 rounded border border-dashed border-zinc-700 bg-zinc-950 px-5 py-4">
            <div className="text-sm text-zinc-400"><span className="text-zinc-200">New here?</span> Load a sample interview log, then ask a question.</div>
            <button onClick={() => setNotes(SAMPLE_NOTES)} className="shrink-0 rounded bg-red-800 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Load sample notes</button>
          </div>
        )}

        <div className="mt-6 min-h-[380px] space-y-6 rounded border border-zinc-800 bg-[#0d0e11] p-6">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-zinc-600">Try</p>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} disabled={busy} className="block w-full rounded border border-zinc-800 px-4 py-2.5 text-left text-sm text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900">{s}</button>
              ))}
            </div>
          )}
          {messages.map((m) => {
            const text = textOf(m);
            const user = m.role === 'user';
            const shown = user ? text.split('\n\n--- Notes (untrusted data) ---')[0] : text;
            const refused = !user && /^(Refused|I won't)/.test(text);
            return (
              <article key={m.id} className={`border-l-2 pl-4 ${user ? 'border-zinc-600' : refused ? 'border-amber-600' : 'border-red-800'}`}>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                  {user ? `You · as sent, masked${text.includes('--- Notes') ? ' · notes attached' : ''}` : label.who}
                </div>
                <div className={`mt-1.5 whitespace-pre-wrap leading-relaxed ${user ? 'text-sm text-zinc-300' : 'font-serif text-[15px] text-zinc-100'}`}>{shown}</div>
                {!user && !busy && !refused && text && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => propose(text, 'save')} className="rounded border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">Propose save</button>
                    <button onClick={() => propose(text, 'export')} className="rounded border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100">Propose export</button>
                  </div>
                )}
              </article>
            );
          })}
          {status === 'submitted' && <p className="animate-pulse text-xs text-zinc-500">Reading masked notes…</p>}
          {error && <p className="text-sm text-red-400">Request failed. Nothing was saved or sent. {error.message}</p>}
          <div ref={end} />
        </div>

        <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="mt-4 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a research question…" className="flex-1 rounded border border-zinc-700 bg-[#0d0e11] px-4 py-3 text-sm outline-none focus:border-red-800" />
          {busy ? <button type="button" onClick={() => stop()} className="rounded border border-zinc-600 px-5 text-sm text-zinc-200">Stop</button>
            : <button className="rounded bg-zinc-100 px-6 text-sm font-medium text-zinc-900 hover:bg-white">Ask</button>}
        </form>
        <label className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
          <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} /> Attach notes from Sources ({notes.length} chars, masked before sending)
        </label>
      </section>

      <aside className="space-y-4 text-sm">
        <Card title="Protections">
          <li>✓ Credentials stripped server-side</li>
          <li>✓ No keys in browser or model context</li>
          <li className="text-zinc-500">◌ Masking: demo heuristic, not a guarantee (M2)</li>
          <li className="text-zinc-500">◌ Propose → approve gate (M3 placeholder)</li>
        </Card>
        <Card title={`Mask map · ${map.length}`}>
          {map.length === 0 ? <li className="text-zinc-500">Nothing masked yet</li> : map.slice(0, 10).map((e) => (
            <li key={e.token} className="flex justify-between font-mono text-xs"><span className="text-red-400">{e.token}</span><span className="text-zinc-600">{e.kind}</span></li>
          ))}
        </Card>
        <Card title="Pending approvals"><li>{proposals.filter((p) => p.status === 'pending').length} waiting</li></Card>
      </aside>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-zinc-800 bg-[#0d0e11] p-4">
      <div className="mb-2.5 text-[10px] uppercase tracking-[0.2em] text-zinc-500">{title}</div>
      <ul className="space-y-1.5 text-zinc-300">{children}</ul>
    </div>
  );
}
