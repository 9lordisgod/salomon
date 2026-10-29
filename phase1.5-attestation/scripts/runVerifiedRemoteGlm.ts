// Phase 2 M1: live verified-remote against the sole allowlisted pin. Digest-only output. Key from .env only; never printed.
// Usage: npx vite-node scripts/runVerifiedRemoteGlm.ts [--negative-only]
import fs from "node:fs"; import { createHash } from "node:crypto";
import { AttestationClient, VerifiedCompletionClient, NobleResponseBinder, DigestLogger, type DigestLogRecord } from "../src/index.js";
const MODEL = "z-ai/glm-5.3-flash";
const NEG_MODELS = ["openai/privacy-filter"]; // real, non-abliterated, NOT allowlisted ⇒ must DENY
const key = fs.readFileSync(new URL("../.env", import.meta.url), "utf8").match(/^NEAR_AI_CLOUD_API_KEY=["']?([^"'\r\n]+)/m)?.[1];
if (!key) { console.log(JSON.stringify({ error: "key_missing_in_env" })); process.exit(2); }
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const records: DigestLogRecord[] = []; const logger = new DigestLogger((l) => records.push(typeof l === "string" ? JSON.parse(l) : l));
const env = { NEAR_AI_CLOUD_API_KEY: key };
const mk = () => new AttestationClient({ requireProductionPlugs: true, env, logger });
const out: any = { run_started_utc: new Date().toISOString(), model_id: MODEL, measurements_sha256: sha(fs.readFileSync(new URL("../allowlist/measurements.json", import.meta.url), "utf8")) };
const errInfo = (e: any) => ({ check: e?.check ?? null, reason: String(e?.reason ?? e?.message ?? "error").replaceAll(key, "[redacted]").slice(0, 200) });

out.negative = [];
for (const m of NEG_MODELS) {
  const c = mk(); try { await c.verifyForModel(m); out.negative.push({ model_id: m, denied: false }); }
  catch (e) { out.negative.push({ model_id: m, denied: true, ...errInfo(e) }); }
}
// Negative 2: the allowlisted GLM itself against an EMPTY allowlist (temp file; measurements.json untouched) ⇒ allowlist miss DENY.
{ const tmp = `${process.env.TMPDIR ?? "/tmp"}/empty-allowlist-${process.pid}.json`; fs.writeFileSync(tmp, JSON.stringify({ entries: [] }));
  const c = new AttestationClient({ requireProductionPlugs: true, env, logger, allowlistPath: tmp });
  try { await c.verifyForModel(MODEL); out.negative.push({ model_id: MODEL, allowlist: "empty_temp", denied: false }); }
  catch (e) { out.negative.push({ model_id: MODEL, allowlist: "empty_temp", denied: true, ...errInfo(e) }); } finally { fs.rmSync(tmp, { force: true }); } }
if (!process.argv.includes("--negative-only")) {
  const c = mk();
  try {
    const set = await c.verifyForModel(MODEL);
    out.preflight = { verified: true, candidates: set.length, attestations: set.map((v) => ({ nonceHash: v.nonceHash, quoteSha256: v.quoteSha256,
      rtmr3_prefix: v.rtmr3.slice(0, 16), mrconfigid_prefix: v.mrConfigId.slice(0, 18), composeSha256: v.composeSha256, tcbStatus: v.tcbStatus,
      nvidiaVerified: v.nvidiaVerified, composeManagerQuoteSha256: v.composeManagerQuoteSha256 ?? null, allowlistEntry_sha256: sha(v.allowlistEntry),
      signingAlgo: v.signingAlgo ?? "ecdsa", signingAddressSha256: sha(v.signingAddress.toLowerCase().replace(/^0x/, "")), verifiedAt: v.verifiedAt })) };
    const vc = new VerifiedCompletionClient({ attestation: c, binder: new NobleResponseBinder(), apiKey: key, logger,
      fetch: (u, i) => fetch(u, i as any) as any });
    const r = await vc.complete(MODEL, { messages: [{ role: "user", content: "Reply with the single word OK." }], max_tokens: 8, stream: false });
    out.completion = { verified: r.verified, requestHash: r.requestHash, responseHash: r.responseHash, chatId_present: !!r.chatId,
      signingAlgo: r.attestation.signingAlgo ?? "ecdsa", signingAddressSha256: sha(r.attestation.signingAddress.toLowerCase().replace(/^0x/, "")),
      rtmr3_prefix: r.attestation.rtmr3.slice(0, 16), mrconfigid_prefix: r.attestation.mrConfigId.slice(0, 18) };
  } catch (e) { out.happy_fail = errInfo(e); }
}
out.verify_log = records; out.run_finished_utc = new Date().toISOString();
const neg_ok = out.negative.every((n: any) => n.denied);
out.verified = !!out.completion?.verified && neg_ok;
let s = JSON.stringify(out, null, 1); if (s.includes(key)) { console.log(JSON.stringify({ error: "key_in_output_aborted" })); process.exit(3); }
console.log(s); process.exit(process.argv.includes("--negative-only") ? (neg_ok ? 0 : 1) : (out.verified ? 0 : 1));
