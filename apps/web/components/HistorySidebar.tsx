'use client';
import { deleteThread, setActiveThread, useThreads } from '@/lib/store';

function when(iso: string) {
  const d = new Date(iso), now = new Date();
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function HistorySidebar({ onPick }: { onPick?: () => void }) {
  const { threads, activeId } = useThreads();
  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <button
          type="button"
          onClick={() => { setActiveThread(null); onPick?.(); }}
          className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-zinc-200 shadow-sm shadow-black/20 hover:bg-white/[0.06]"
        >
          <span className="text-[15px] leading-none">＋</span> New chat
        </button>
      </div>
      <div className="px-4 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600">History · this device</div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {threads.length === 0 ? (
          <p className="px-2 py-3 text-[12px] leading-relaxed text-zinc-600">No chats yet. Your threads are saved locally in this browser.</p>
        ) : (
          threads.map((t) => (
            <div key={t.id} className={`group flex items-center rounded-lg ${t.id === activeId ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'}`}>
              <button
                type="button"
                onClick={() => { setActiveThread(t.id); onPick?.(); }}
                className="min-w-0 flex-1 px-2.5 py-2 text-left"
              >
                <div className={`truncate text-[13px] ${t.id === activeId ? 'text-zinc-100' : 'text-zinc-400'}`}>{t.title}</div>
                <div className="text-[10px] text-zinc-600">{when(t.updatedAt)}</div>
              </button>
              <button
                type="button"
                aria-label="Delete chat"
                onClick={() => deleteThread(t.id)}
                className="mr-1 hidden rounded px-1.5 text-[13px] text-zinc-600 hover:text-zinc-300 group-hover:block"
              >×</button>
            </div>
          ))
        )}
      </nav>
    </div>
  );
}
