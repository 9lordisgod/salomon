import { createHash } from "node:crypto";
import type { AllowlistEntry, AttestationReport, EventLogEntry, MeasurementPolicy, ModelAttestation, VerifiedAttestation } from "./types.js";
import { AttestationError } from "./types.js";
import type { GatewayVerifier, GpuVerifier, QuoteVerifier } from "./quoteVerifier.js";
import { DigestLogger, nonceHash } from "./digestLog.js";
import { matchPins } from "./allowlist.js";

const hex = (s: string) => s.toLowerCase().replace(/^0x/, "");
const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

export const DEFAULT_POLICY: MeasurementPolicy = {
  requireModelAttestations: true,
  allowedTcbStatuses: ["UpToDate"], // TODO(Privacy Security): finalize TCB set
  allowedAdvisoryIds: [],           // TODO(Privacy Security)
  requireNvidiaEvidence: false,     // LOCKED Decision 1: verify-if-present; require_gpu=false for 1.5
};

/** RTMR replay: rtmr = SHA384(rtmr || digest), starting at 48 zero bytes. */
export function replayRtmr(events: EventLogEntry[], imr = 3): string {
  let rtmr = Buffer.alloc(48);
  for (const e of events) {
    if (e.imr !== imr) continue;
    let d = Buffer.from(hex(e.digest), "hex");
    if (d.length > 48) throw new AttestationError("rtmr3_replay", "event digest > 48 bytes");
    if (d.length < 48) d = Buffer.concat([d, Buffer.alloc(48 - d.length)]);
    rtmr = createHash("sha384").update(Buffer.concat([rtmr, d])).digest();
  }
  return rtmr.toString("hex");
}

/** MRCONFIGID expected = 0x01 || sha256(app_compose raw) || 15 zero bytes. */
export function expectedMrConfigId(appCompose: string): { composeSha256: string; mrConfigId: string } {
  const composeSha256 = sha256(Buffer.from(appCompose, "utf8"));
  return { composeSha256, mrConfigId: "01" + composeSha256 + "00".repeat(15) };
}

/** report_data (64B) = signing_address right-padded to 32 || nonce (32). TODO(Privacy Security): confirm ecdsa/ed25519 layout. */
export function expectedReportData(signingAddress: string, nonce: string): string {
  const addr = Buffer.from(hex(signingAddress), "hex");
  if (addr.length === 0 || addr.length > 32) throw new AttestationError("signing_address_binding", "bad signing_address");
  return Buffer.concat([addr, Buffer.alloc(32 - addr.length)]).toString("hex") + hex(nonce);
}

function parseEvents(ev: ModelAttestation["event_log"]): EventLogEntry[] {
  if (Array.isArray(ev)) return ev;
  if (typeof ev === "string") { try { const p = JSON.parse(ev); if (Array.isArray(p)) return p; } catch {} }
  throw new AttestationError("rtmr3_replay", "event_log missing or malformed");
}

/** Raw app_compose: from info.app_compose, info.tcb_info (JSON text or object), or top-level. Never re-serialized. */
function appComposeOf(a: ModelAttestation): string {
  let c: unknown = a.info?.app_compose ?? a.app_compose;
  if (c === undefined) {
    let tcb: unknown = (a.info as any)?.tcb_info ?? (a as any).tcb_info;
    if (typeof tcb === "string") { try { tcb = JSON.parse(tcb); } catch { tcb = undefined; } }
    c = (tcb as any)?.app_compose;
  }
  if (typeof c !== "string" || !c) throw new AttestationError("compose_mrconfigid", "app_compose missing");
  return c;
}

export interface VerifyDeps {
  quoteVerifier: QuoteVerifier; gpuVerifier: GpuVerifier; gatewayVerifier: GatewayVerifier;
  policy: MeasurementPolicy; allowlist: AllowlistEntry[]; logger: DigestLogger;
}

async function verifyOne(a: ModelAttestation, idx: number, modelId: string, nonce: string, d: VerifyDeps): Promise<VerifiedAttestation> {
  if (!a || typeof a.intel_quote !== "string" || !a.intel_quote || typeof a.signing_address !== "string")
    throw new AttestationError("evidence_present", "intel_quote/signing_address missing");
  if (typeof a.request_nonce !== "string" || hex(a.request_nonce) !== hex(nonce))
    throw new AttestationError("nonce_binding", "request_nonce mismatch");
  const quoteSha256 = sha256(Buffer.from(hex(a.intel_quote), "hex"));
  const q = await d.quoteVerifier.verifyQuote(a.intel_quote);
  if (!q.ok) throw new AttestationError("quote", q.reason);
  if (!d.policy.allowedTcbStatuses.includes(q.tcbStatus)) throw new AttestationError("tcb_policy", `tcb ${q.tcbStatus}`);
  const badAdv = q.advisoryIds.filter((x) => !d.policy.allowedAdvisoryIds.includes(x));
  if (badAdv.length) throw new AttestationError("tcb_policy", `advisories ${badAdv.join(",")}`);
  const rd = hex(q.reportData);
  if (rd.slice(64, 128) !== hex(nonce)) throw new AttestationError("nonce_binding", "report_data nonce mismatch");
  if (rd !== expectedReportData(a.signing_address, nonce)) throw new AttestationError("signing_address_binding", "report_data address mismatch");
  const events = parseEvents(a.event_log);
  const rtmr3 = replayRtmr(events);
  if (rtmr3 !== hex(q.rtmr3)) throw new AttestationError("rtmr3_replay", "RTMR3 mismatch");
  const { composeSha256, mrConfigId } = expectedMrConfigId(appComposeOf(a));
  if (mrConfigId !== hex(q.mrConfigId)) throw new AttestationError("compose_mrconfigid", "MRCONFIGID mismatch");
  // GPU: verify-if-present; require_gpu ⇒ absent = deny
  const hasGpu = a.nvidia_payload != null && a.nvidia_payload !== "";
  if (!hasGpu && d.policy.requireNvidiaEvidence) throw new AttestationError("nvidia", "nvidia_payload missing (require_gpu=true)");
  let nvidiaVerified = false, gpuSha256: string | undefined;
  if (hasGpu) {
    const g = await d.gpuVerifier.verifyGpu(a.nvidia_payload, nonce);
    if (!g.ok) throw new AttestationError("nvidia", g.reason ?? "gpu verify failed");
    nvidiaVerified = true;
    gpuSha256 = sha256(typeof a.nvidia_payload === "string" ? a.nvidia_payload : JSON.stringify(a.nvidia_payload));
  }
  if (d.policy.allowedMrTds && (!q.mrTd || !d.policy.allowedMrTds.includes(hex(q.mrTd))))
    throw new AttestationError("allowlist", "MRTD not allowlisted");
  const pins = matchPins(d.allowlist, { modelId, mrConfigId, composeSha256, rtmr3, gpuChecked: nvidiaVerified, gpuSha256,
    imr3Digests: events.filter((e) => e.imr === 3).map((e) => hex(e.digest)) });
  if (pins.length === 0) throw new AttestationError("allowlist", "no exact allowlist pin");
  // Multiple identical-pin release entries are fine; record the first.
  return { modelId, signingAddress: hex(a.signing_address), nonceHash: nonceHash(nonce), quoteSha256, composeSha256, rtmr3, mrConfigId,
    tcbStatus: q.tcbStatus, nvidiaVerified, candidateIndex: idx, verifiedAt: new Date().toISOString(), allowlistEntry: `${pins[0].effective_from}|${pins[0].privacy_security_approver}` };
}

/** Gateway path: gateway_attestation AND every model candidate must pass. Any failure ⇒ deny all. */
export async function verifyReport(report: AttestationReport, modelId: string, nonce: string, d: VerifyDeps): Promise<VerifiedAttestation[]> {
  const nh = nonceHash(nonce);
  const base = { event: "attestation_verify" as const, modelId, nonceHash: nh, provider: "near", signingAlgo: "ecdsa" };
  let scope: "gateway" | "model" = "gateway", idx = -1;
  try {
    if (d.allowlist.length === 0) throw new AttestationError("allowlist_load", "allowlist empty (deny-all)");
    const gw = report?.gateway_attestation;
    if (!gw || typeof gw !== "object") throw new AttestationError("gateway", "gateway_attestation_missing");
    const g = await d.gatewayVerifier.verifyGateway(gw, nonce);
    if (!g.ok) throw new AttestationError("gateway", g.reason ?? "gateway verify failed");
    d.logger.log({ ...base, scope, result: "pass", ...(g.quoteSha256 ? { quoteSha256: g.quoteSha256 } : {}) });
    scope = "model";
    const list = report?.model_attestations;
    if (!Array.isArray(list) || list.length === 0) throw new AttestationError("evidence_present", "model_attestations empty");
    const out: VerifiedAttestation[] = [];
    for (idx = 0; idx < list.length; idx++) {
      const v = await verifyOne(list[idx], idx, modelId, nonce, d);
      d.logger.log({ ...base, scope, result: "pass", candidateIndex: String(idx), signingAddressSha256: sha256(v.signingAddress),
        quoteSha256: v.quoteSha256, composeSha256: v.composeSha256, rtmr3: v.rtmr3, mrConfigId: v.mrConfigId, tcbStatus: v.tcbStatus });
      out.push(v);
    }
    if (out.length === 0) throw new AttestationError("evidence_present", "no retained candidates");
    return out;
  } catch (e) {
    const err = e instanceof AttestationError ? e : new AttestationError("quote", "unexpected verifier error");
    d.logger.log({ ...base, scope, result: "fail", check: err.check, reason: err.reason.slice(0, 200),
      ...(idx >= 0 ? { candidateIndex: String(idx) } : {}) });
    throw err;
  }
}
