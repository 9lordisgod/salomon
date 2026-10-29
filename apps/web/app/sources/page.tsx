'use client';
import { maskText } from '@/lib/mask';
import { useMaskMap, useNotes } from '@/lib/store';

const SAMPLE = `Met Maria Lopez at the café on 5th. She works in procurement and says the contract was backdated.
Reach her at maria.lopez@example.org or (604) 555-0142. Her colleague @dockworker_77 has copies.
Source: "Heron" confirms the invoice dates. Follow up with Daniel Okafor at City Hall.`;

export default function Sources() {
  const [notes, setNotes] = useNotes();
  const [map, setMap] = useMaskMap();
  const preview = maskText(notes, map);
  return (
    <div>
      <h1 className="font-serif text-3xl text-zinc-50">Sources</h1>
      <p className="mt-1 text-sm text-zinc-400">Paste notes or a transcript. Only the masked version ever leaves this page. The mask map stays in this browser.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-widest text-zinc-500">
            <span>Original (stays on this device)</span>
            <button onClick={() => setNotes(SAMPLE)} className="normal-case tracking-normal text-zinc-400 underline">Load sample</button>
          </div>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 20000))} rows={14} className="w-full rounded border border-zinc-800 bg-[#0e1115] p-4 font-mono text-sm outline-none focus:border-zinc-600" placeholder="Paste notes…" />
        </div>
        <div>
          <div className="mb-2 text-[11px] uppercase tracking-widest text-zinc-500">What the model sees</div>
          <pre className="min-h-[340px] whitespace-pre-wrap rounded border border-zinc-800 bg-[#0e1115] p-4 font-mono text-sm text-zinc-300">{preview.text || '—'}</pre>
        </div>
      </div>
      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-serif text-xl text-zinc-100">Mask map</h2>
        <div className="flex gap-2">
          <button onClick={() => setMap(preview.map)} className="rounded bg-zinc-100 px-3 py-1.5 text-sm text-zinc-900">Apply masks</button>
          <button onClick={() => setMap([])} className="rounded border border-zinc-700 px-3 py-1.5 text-sm">Clear map</button>
        </div>
      </div>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="text-[11px] uppercase tracking-widest text-zinc-500"><tr><th className="py-2">Token</th><th>Type</th><th>Original (local only)</th></tr></thead>
        <tbody>
          {preview.map.map((e) => (
            <tr key={e.token} className="border-t border-zinc-800"><td className="py-2 font-mono text-emerald-400">{e.token}</td><td className="text-zinc-400">{e.kind}</td><td className="font-mono text-zinc-300">{e.original}</td></tr>
          ))}
          {preview.map.length === 0 && <tr><td colSpan={3} className="py-3 text-zinc-500">No identifying details detected.</td></tr>}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-zinc-600">Demo heuristics (regex for emails, phones, handles, code names, capitalized names). Review every row; this is not a guarantee of anonymity.</p>
    </div>
  );
}
