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
    <div className="relative mx-auto flex min-h-[calc(100vh-9rem)] max-w-3xl flex-col">
      <div className="flex-1 pb-44">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center pt-[12vh] text-center">
            <h1 className="text-2xl font-medium tracking-tight text-zinc-100">What are you reporting on?</h1>
            <p className="mt-2 max-w-md text-[13px] leading-relaxed text-zinc-500">
              Names, emails, phones and handles are masked in your browser before sending — a demo heuristic, not a guarantee.
            </p>
            {!notes && (
              <button onClick={() => setNotes(SAMPLE_NOTES)} className="mt-6 rounded-full border border-white/10 px-3.5 py-1.5 text-[13px] text-zinc-300 hover:bg-white/5">Load sample interview notes</button>
            )}
            <div className="mt-8 grid w-full gap-2 sm:grid-cols-2">
              {SUGGESTIONS.slice(0, 2).map((s) => (
                <button key={s} onClick={() => ask(s)} disabled={busy} className="rounded-xl border border-white/[0.07] px-4 py-3 text-left text-[13px] leading-snug text-zinc-400 hover:bg-white/[0.03] hover:text-zinc-200">{s}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8 pt-2">
            {messages.map((m) => {
              const text = textOf(m);
              const user = m.role === 'user';
              const shown = user ? text.split('\n\n--- Notes (untrusted data) ---')[0] : text;
              const refused = !user && /^(Refused|I won't)/.test(text);
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
                      <button onClick={() => propose(text, 'save')} className="hover:text-zinc-300">Propose save</button>
                      <button onClick={() => propose(text, 'export')} className="hover:text-zinc-300">Propose export</button>
                    </div>
                  )}
                </article>
              );
            })}
            {status === 'submitted' && <p className="animate-pulse text-[13px] text-zinc-500">Reading masked notes…</p>}
            {error && <p className="text-[13px] text-red-400/90">Request failed. Nothing was saved or sent. {error.message}</p>}
            <div ref={end} />
          </div>
        )}

        <details className="mt-12 text-[12px] text-zinc-500">
          <summary className="cursor-pointer select-none text-zinc-600 hover:text-zinc-400">Protections · mask map ({map.length}) · {proposals.filter((p) => p.status === 'pending').length} pending approvals</summary>
          <div className="mt-3 grid gap-4 rounded-xl border border-white/[0.07] p-4 sm:grid-cols-2">
            <ul className="space-y-1">
              <li>✓ Credentials stripped server-side</li>
              <li>✓ No keys in browser or model context</li>
              <li>◌ Masking: demo heuristic, not a guarantee (M2)</li>
              <li>◌ Propose → approve gate (M3 placeholder)</li>
            </ul>
            <ul className="space-y-1 font-mono text-[11px]">
              {map.length === 0 ? <li>Nothing masked yet</li> : map.slice(0, 10).map((e) => (
                <li key={e.token} className="flex justify-between"><span className="text-zinc-300">{e.token}</span><span>{e.kind}</span></li>
              ))}
            </ul>
          </div>
        </details>
      </div>

      <div className="sticky bottom-0 -mx-2 bg-gradient-to-t from-[#0e0f11] via-[#0e0f11] to-transparent px-2 pb-4 pt-6">
        <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="rounded-2xl border border-white/10 bg-[#16171a] p-2 focus-within:border-white/20">
          <textarea value={input} rows={2} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); } }}
            placeholder="Ask about your reporting…" className="block max-h-48 w-full resize-none bg-transparent px-2 py-1.5 text-[15px] text-zinc-100 outline-none placeholder:text-zinc-600" />
          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <input type="checkbox" checked={attach} onChange={(e) => setAttach(e.target.checked)} className="accent-zinc-400" /> Attach notes ({notes.length} chars, masked)
            </label>
            {busy ? <button type="button" onClick={() => stop()} className="rounded-full border border-white/15 px-3 py-1 text-[12px] text-zinc-200">Stop</button>
              : <button disabled={!input.trim()} className="rounded-full bg-zinc-100 px-3.5 py-1 text-[12px] font-medium text-zinc-900 disabled:opacity-30">Send</button>}
          </div>
        </form>
      </div>
    </div>
  );
}
