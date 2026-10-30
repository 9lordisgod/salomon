import { askLocal, createSpawnCompleter } from "./index.js";
const c = createSpawnCompleter({ backend: "gguf", python: process.env.SALOMON_PYTHON, timeoutMs: 600000 });
const t0=Date.now();
const r1: any = await askLocal({ question: "Say hello in one short sentence." }, { completer: c, timeoutMs: 600000 } as any);
console.log("HELLO", JSON.stringify({ ok: r1.ok, reason: r1.reason, status: r1.status, answer: String(r1.answer ?? r1.text ?? "").slice(0,160), ms: Date.now()-t0 }));
const r2: any = await askLocal({ question: "my password: hunter22abc" }, { completer: c } as any);
console.log("PW", JSON.stringify({ ok: r2.ok, reason: r2.reason, status: r2.status }));
