// Offline (digest-only) verification of recorded NEAR fixtures. No API key used.
import fs from "node:fs"; import { createHash } from "node:crypto";
import { DcapQuoteVerifier, DcapGatewayVerifier, NrasGpuVerifier, NobleResponseBinder, replayRtmr, recomputeImr3Digests, expectedMrConfigId, expectedReportData, verifyReport, DEFAULT_POLICY, DigestLogger, nonceHash, verifyComposeManager } from "../src/index.js";
const slug = process.argv[2]!; const R = `fixtures/recorded/raw/${slug}`;
const sha = (b: string | Buffer) => createHash("sha256").update(b).digest("hex");
const rep = JSON.parse(fs.readFileSync(`${R}.report.raw.json`, "utf8")); const nonce = fs.readFileSync(`${R}.nonce.txt`, "utf8").trim();
const a = rep.model_attestations[0]; const gw = rep.gateway_attestation; const out: any = { slug, model_id: rep.model_attestations[0].model_name, nonceHash: nonceHash(nonce), verified_at_utc: new Date().toISOString() };
const qv = new DcapQuoteVerifier(); const q = await qv.verifyQuote(a.intel_quote);
out.model_quote = q.ok ? { ok: true, quote_sha256: sha(Buffer.from(a.intel_quote, "hex")), tcbStatus: q.tcbStatus, advisoryIds: q.advisoryIds, mrtd: q.mrTd, rtmr3: q.rtmr3, mrconfigid: q.mrConfigId } : q;
out.gateway = await new DcapGatewayVerifier().verifyGateway(gw, nonce);
const gq = await qv.verifyQuote(gw.intel_quote); out.gateway_quote = gq.ok ? { tcbStatus: gq.tcbStatus, advisoryIds: gq.advisoryIds, rtmr3: gq.rtmr3, mrconfigid: gq.mrConfigId, mrtd: gq.mrTd } : gq;
const ev = typeof a.event_log === "string" ? JSON.parse(a.event_log) : a.event_log;
const rt = replayRtmr(ev); out.rtmr3_replay = { recomputed: rt, matches_quote: q.ok && rt === q.rtmr3, imr3_digests: recomputeImr3Digests(ev) };
const compose = a.info?.tcb_info?.app_compose; const mc = expectedMrConfigId(compose);
out.compose = { app_compose_sha256: mc.composeSha256, expected_mrconfigid: mc.mrConfigId, matches_quote: q.ok && mc.mrConfigId === q.mrConfigId, info_compose_hash: a.info?.compose_hash, app_name: a.info?.app_name };
out.report_data = { matches: q.ok && q.reportData === expectedReportData(a.signing_address, nonce, a.signing_algo ?? "ecdsa") };
out.signing_address_sha256 = sha(a.signing_address.toLowerCase().replace(/^0x/, ""));
out.nvidia_payload_sha256 = typeof a.nvidia_payload === "string" ? sha(Buffer.from(a.nvidia_payload, "utf8")) : null;
out.nras = await new NrasGpuVerifier().verifyGpu(a.nvidia_payload, nonce);
if (fs.existsSync(`${R}.signature.raw.json`)) {
  const s = JSON.parse(fs.readFileSync(`${R}.signature.raw.json`, "utf8"));
  const reqH = sha(fs.readFileSync(`${R}.completion.req.json`)), resH = sha(fs.readFileSync(`${R}.completion.resp.json`));
  const exp = `${out.model_id}:${reqH}:${resH}`;
  out.provider_tee = { signature_kind: s.signature_kind, signing_algo: s.signing_algo, text_matches_exact_bytes: s.text === exp, request_sha256: reqH, response_sha256: resH,
    signer_matches_model_attestation: s.signing_address?.toLowerCase() === a.signing_address.toLowerCase(), signature_sha256: sha(s.signature),
    binder: await new NobleResponseBinder().verify(s.text, s.signature, s.signing_address, s.signing_algo) };
}
if (a.compose_manager_attestation != null) {
  const c = a.compose_manager_attestation; const cq = await qv.verifyQuote(c.quote);
  try { const s = await verifyComposeManager(c, nonce, qv, DEFAULT_POLICY);
    out.compose_manager = { ok: true, quote_sha256: s.quoteSha256, tcbStatus: s.tcbStatus, advisoryIds: cq.ok ? cq.advisoryIds : null,
      rtmr3: cq.ok ? cq.rtmr3 : null, mrtd: cq.ok ? cq.mrTd : null, mrconfigid: cq.ok ? cq.mrConfigId : null,
      report_data_eq_actions_hash_nonce: true, nonce_source: c.nonce_source, actions_hash_record_only: c.actions_hash,
      actions_count: s.actionsCount, latest_compose_up: s.latestComposeUp, compose_manager_images: s.composeManagerImages, vm_config_image: s.vmConfigImage };
  } catch (e: any) { out.compose_manager = { ok: false, check: e?.check, reason: e?.reason }; }
  const ev3 = (typeof a.event_log === "string" ? JSON.parse(a.event_log) : a.event_log).filter((e: any) => e.imr === 3);
  out.instance_id = ev3.find((e: any) => e.event === "instance-id")?.event_payload ?? null;
  out.app_id = ev3.find((e: any) => e.event === "app-id")?.event_payload ?? null;
} else out.compose_manager = "absent";
try { await verifyReport(rep, out.model_id, nonce, { quoteVerifier: qv, gpuVerifier: new NrasGpuVerifier(), gatewayVerifier: new DcapGatewayVerifier(), policy: DEFAULT_POLICY, allowlist: [], logger: new DigestLogger(() => {}) }); out.verifyReport_empty_allowlist = "UNEXPECTED_PASS"; }
catch (e: any) { out.verifyReport_empty_allowlist = `DENY ${e?.check ?? ""} ${e?.message ?? ""}`; }
fs.writeFileSync(`fixtures/recorded/${slug}.verify.meta.json`, JSON.stringify(out, null, 2)); console.log(JSON.stringify(out, null, 2));
