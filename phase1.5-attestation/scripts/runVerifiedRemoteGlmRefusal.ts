// Live Phase 1 refusal suite vs allowlisted z-ai/glm-5.3-flash over verified-remote/attest path. Key from .env only; never printed.
// Usage: npx vite-node scripts/runVerifiedRemoteGlmRefusal.ts  (writes ../phase1-slm/outputs/eval_refusal_glm_live/raw.jsonl; score with scoreGlmRefusal.py)
import fs from "node:fs"; import { createHash } from "node:crypto";
import { AttestationClient, VerifiedCompletionClient, NobleResponseBinder, DigestLogger } from "../src/index.js";
const MODEL = "z-ai/glm-5.3-flash"; const RETRIES = 5;
const key = fs.readFileSync(new URL("../.env", import.meta.url), "utf8").match(/^ATTEST_API_KEY=["']?([^"'\r\n]+)/m)?.[1];
if (!key) { console.log(JSON.stringify({ error: "key_missing_in_env" })); process.exit(2); }
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const outDir = new URL("../../phase1-slm/outputs/eval_refusal_glm_live/", import.meta.url);
const SYS = JSON.parse(fs.readFileSync(new URL("system_prompt.json", outDir), "utf8")).system_prompt as string;
const rows = fs.readFileSync(new URL("../../phase1-slm/data/eval_refusal.jsonl", import.meta.url), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const logger = new DigestLogger(() => {}); const env = { ATTEST_API_KEY: key };
const errInfo = (e: any) => ({ check: e?.check ?? null, reason: String(e?.reason ?? e?.message ?? "error").replaceAll(key, "[redacted]").slice(0, 200) });
const lines: string[] = [];
for (const r of rows) {
  const rec: any = { id: r.id, model_id: MODEL, system_prompt_sha256: sha(SYS), attempts: [] };
  for (let i = 1; i <= RETRIES; i++) {
    try {
      const c = new AttestationClient({ requireProductionPlugs: true, env, logger });
      await c.verifyForModel(MODEL);
      const vc = new VerifiedCompletionClient({ attestation: c, binder: new NobleResponseBinder(), apiKey: key, logger, fetch: (u, x) => fetch(u, x as any) as any });
      const res = await vc.complete(MODEL, { messages: [{ role: "system", content: SYS }, { role: "user", content: r.prompt }],
        max_tokens: 1536, stream: false, thinking_token_budget: 1024 });
      const msg = (res.response as any)?.choices?.[0]?.message ?? {};
      rec.verified = res.verified; rec.requestHash = res.requestHash; rec.responseHash = res.responseHash;
      rec.signingAddressSha256 = sha(res.attestation.signingAddress.toLowerCase().replace(/^0x/, ""));
      rec.rtmr3_prefix = res.attestation.rtmr3.slice(0, 16); rec.composeSha256 = (res.attestation as any).composeSha256 ?? null;
      rec.content = msg.content ?? ""; rec.content_empty = !rec.content?.trim();
      rec.reasoning_len = (msg.reasoning_content ?? msg.reasoning ?? "").length;
      rec.finish_reason = (res.response as any)?.choices?.[0]?.finish_reason ?? null;
      rec.attempts.push({ n: i, ok: true }); break;
    } catch (e) { rec.attempts.push({ n: i, ok: false, ...errInfo(e) }); rec.verified = false; }
  }
  if (!rec.verified) rec.status = "DENY";
  const s = JSON.stringify(rec); if (s.includes(key)) { console.log(JSON.stringify({ error: "key_in_output_aborted" })); process.exit(3); }
  lines.push(s); console.log(JSON.stringify({ id: r.id, verified: rec.verified, attempts: rec.attempts.length, content_empty: rec.content_empty, finish: rec.finish_reason }));
}
fs.writeFileSync(new URL("raw.jsonl", outDir), lines.join("\n") + "\n");
