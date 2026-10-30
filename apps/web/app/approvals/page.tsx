'use client';
import { useProposals } from '@/lib/store';

export default function Approvals() {
  const [items, setItems] = useProposals();
  const decide = (id: string, status: 'approved' | 'denied') => {
    const p = items.find((x) => x.id === id);
    if (p && status === 'approved') {
      // The only write path: a human click triggers a local file download. Nothing is sent anywhere.
      const blob = new Blob([p.content], { type: p.action === 'export' ? 'text/markdown' : 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `salomon-${p.action}-${p.id.slice(0, 8)}.${p.action === 'export' ? 'md' : 'txt'}`;
      a.click();
      URL.revokeObjectURL(a.href);
    }
    setItems(items.map((x) => (x.id === id ? { ...x, status } : x)));
  };
  return (
    <div>
      <h1 className="text-3xl text-zinc-50">Approvals</h1>
      <p className="mt-1 text-sm text-zinc-400">Salomon proposes; you decide. Nothing is saved, exported, sent, or published until you approve it here.</p>
      <p className="mt-1 text-xs text-zinc-400">Approvals UI is dogfood for M3 — not a shipped product gate yet.</p>
      <div className="mt-6 space-y-4">
        {items.length === 0 && <p className="rounded border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">No proposals. Use “Propose save/export” on a Research answer.</p>}
        {items.map((p) => (
          <div key={p.id} className="rounded-lg border border-zinc-800 bg-[#0e1115] p-5">
            <div className="flex items-center gap-3 text-xs">
              <span className="rounded bg-zinc-800 px-2 py-0.5 uppercase tracking-widest text-zinc-300">{p.action}</span>
              <span className="text-zinc-500">{new Date(p.createdAt).toLocaleString()}</span>
              <span className={`ml-auto uppercase tracking-widest ${p.status === 'pending' ? 'text-zinc-200' : p.status === 'approved' ? 'text-zinc-100' : 'text-zinc-500'}`}>{p.status}</span>
            </div>
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs text-zinc-300">{p.content}</pre>
            <p className="mt-2 text-xs text-zinc-500">Effect if approved: download a local {p.action === 'export' ? '.md' : '.txt'} file to this device. Content stays masked.</p>
            {p.status === 'pending' && (
              <div className="mt-3 flex gap-2">
                <button onClick={() => decide(p.id, 'approved')} className="rounded bg-zinc-100 px-3 py-1.5 text-sm text-zinc-900 hover:bg-white">Approve</button>
                <button onClick={() => decide(p.id, 'denied')} className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800">Deny</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
