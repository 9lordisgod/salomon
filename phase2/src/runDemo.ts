// Phase 2 M2 live smoke. GLM only, production plugs, key from ../phase1.5-attestation/.env (never printed). Digest-only output.
// Usage: npm run demo [-- --no-tool]
import fs from "node:fs"; import { createHash } from "node:crypto";
import { AttestationClient, VerifiedCompletionClient, NobleResponseBinder, DigestLogger } from "../../phase1.5-attestation/src/index.js";
import { runAgentLoop, type LoopLog } from "./agentLoop.js";
import { NearReadOnlyTools } from "./tools/nearReadOnly.js";
import { AGENT_MODEL } from "./model.js";
const key = fs.readFileSync(new URL("../../phase1.5-attestation/.env", import.meta.url), "utf8").match(/^NEAR_AI_CLOUD_API_KEY=["']?([^"'\r\n]+)/m)?.[1];
if (!key) { console.log(JSON.stringify({ error: "key_missing_in_env" })); process.exit(2); }
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const libLog: unknown[] = []; const logger = new DigestLogger((l) => libLog.push(typeof l === "string" ? JSON.parse(l) : l));
const attestation = new AttestationClient({ requireProductionPlugs: true, env: { NEAR_AI_CLOUD_API_KEY: key }, logger });
const completion = new VerifiedCompletionClient({ attestation, binder: new NobleResponseBinder(), apiKey: key, logger, fetch: (u, i) => fetch(u, i as any) as any });
const tools = new NearReadOnlyTools({ fetch: (u, i) => fetch(u, i) as any, rpcUrl: process.env.NEAR_RPC_URL });
const noTool = process.argv.includes("--no-tool");
const multi = process.argv.includes("--multi");
const prompt = noTool ? "Reply with the single word OK." : multi
  ? "For account \"near\": first call view_account, then view_access_key_list, then gas_price. Then answer in two short sentences: does it exist, how many access keys, and the current gas price."
  : "Use the view_account tool on account_id \"near\", then answer in one short sentence whether the account exists.";
const loopLog: LoopLog[] = []; const out: any = { run_started_utc: new Date().toISOString(), model_id: AGENT_MODEL, mode: noTool ? "no_tool" : multi ? "multi_tool_near" : "view_account_near",
  measurements_sha256: sha(fs.readFileSync(new URL("../../phase1.5-attestation/allowlist/measurements.json", import.meta.url), "utf8")) };
try { const r = await runAgentLoop([{ role: "user", content: prompt }], { attestation, completion, tools, log: (x) => loopLog.push(x), maxSteps: multi ? 8 : 4 });
  const tools_called = loopLog.filter((x) => x.event === "tool").length;
  out.result = { ok: true, steps: r.steps, tool_results: tools_called, contentSha256: sha(r.content), contentLength: r.content.length, transcriptSha256: r.transcriptSha256 }; }
catch (e: any) { out.result = { ok: false, reason: String(e?.reason ?? e?.message ?? "error").replaceAll(key, "[redacted]").slice(0, 160), check: e?.check ?? null }; }
out.loop_log = loopLog; out.attest_log = libLog; out.run_finished_utc = new Date().toISOString();
const s = JSON.stringify(out, null, 1); if (s.includes(key)) { console.log(JSON.stringify({ error: "key_in_output_aborted" })); process.exit(3); }
console.log(s); process.exit(out.result.ok ? 0 : 1);
