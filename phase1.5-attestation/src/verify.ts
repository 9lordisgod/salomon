import { createHash } from "node:crypto";
import type { AllowlistEntry, AttestationReport, EventLogEntry, MeasurementPolicy, ModelAttestation, VerifiedAttestation } from "./types.js";
import { AttestationError } from "./types.js";
import type { GatewayVerifier, GpuVerifier, QuoteVerifier } from "./quoteVerifier.js";
import { DigestLogger, nonceHash } from "./digestLog.js";
import { matchPins, checkComposeFilePins } from "./allowlist.js";
import { verifyComposeManager } from "./composeManager.js";

const hex = (s: string) => s.toLowerCase().replace(/^0x/, "");
const sha256 = (b: Buffer | string) => createHash("sha256").update(b).digest("hex");

export const DEFAULT_POLICY: MeasurementPolicy = {
  requireModelAttestations: true,
  allowedTcbStatuses: ["UpToDate"], // TODO(Privacy Security): finalize TCB set
  allowedAdvisoryIds: [],           // TODO(Privacy Security)
  requireNvidiaEvidence: false,     // LOCKED Decision 1: verify-if-present; require_gpu=false for 1.5
};

/** IMR3 event digest per NEAR docs: SHA-384(event_type LE32 || ":" || event UTF-8 || ":" || hex-decoded event_payload). */
export function imr3EventDigest(e: EventLogEntry): Buffer {
  if (!Number.isInteger(e.event_type) || (e.event_type as number) < 0 || (e.event_type as number) > 0xffffffff)
    throw new AttestationError("rtmr3_replay", "event_type missing or not uint32");
  if (typeof e.event !== "string") throw new AttestationError("rtmr3_replay", "event name missing");
  const payloadHex = hex(e.event_payload ?? "");
  if (payloadHex.length % 2 !== 0 || !/^[0-9a-f]*$/.test(payloadHex)) throw new AttestationError("rtmr3_replay", "event_payload not hex");
  const t = Buffer.alloc(4); t.writeUInt32LE(e.event_type as number);
  return createHash("sha384").update(t).update(":").update(Buffer.from(e.event, "utf8")).update(":")
    .update(Buffer.from(payloadHex, "hex")).digest();
}

/** Recompute IMR3 digests (provided non-empty digest must equal recomputed, else DENY). Returns hex digests in order. */
export function recomputeImr3Digests(events: EventLogEntry[]): string[] {
  const out: string[] = [];
  for (const e of events) {
    if (e.imr !== 3) continue;
    const d = imr3EventDigest(e);
    if (e.digest != null && e.digest !== "") {
      const given = hex(e.digest);
      if (given !== d.toString("hex")) throw new AttestationError("rtmr3_replay", "event digest mismatch");
    }
    out.push(d.toString("hex"));
  }
  return out;
}

/** RTMR3 replay (NEAR docs): recompute each IMR3 digest, then rtmr = SHA384(rtmr || digest) from 48 zero bytes. Only imr=3 supported. */
export function replayRtmr(events: EventLogEntry[], imr = 3): string {
  if (imr !== 3) throw new AttestationError("rtmr3_replay", "only IMR3 replay supported");
  let rtmr = Buffer.alloc(48);
  for (const d of recomputeImr3Digests(events)) rtmr = createHash("sha384").update(rtmr).update(Buffer.from(d, "hex")).digest();
  return rtmr.toString("hex");
}

/** MRCONFIGID expected = 0x01 || sha256(app_compose raw) || 15 zero bytes. */
export function expectedMrConfigId(appCompose: string): { composeSha256: string; mrConfigId: string } {
  const composeSha256 = sha256(Buffer.from(appCompose, "utf8"));
  return { composeSha256, mrConfigId: "01" + composeSha256 + "00".repeat(15) };
}

/** LOCKED (PRE_PHASE2_ACCEPTANCE.md §D, no-TLS): pad32(identity) || nonce(32). ecdsa=20B, ed25519=32B exactly. */
export function expectedReportData(signingAddress: string, nonce: string, signingAlgo?: "ecdsa" | "ed25519"): string {
  const addr = Buffer.from(hex(signingAddress), "hex");
  const want = signingAlgo === "ecdsa" ? [20] : signingAlgo === "ed25519" ? [32] : [20, 32];
  if (!want.includes(addr.length)) throw new AttestationError("signing_address_binding", "bad signing_address length");
  if (Buffer.from(hex(nonce), "hex").length !== 32) throw new AttestationError("nonce_binding", "nonce must be 32 bytes");
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
  const algo = a.signing_algo == null ? "ecdsa" : a.signing_algo;
  if (algo !== "ecdsa" && algo !== "ed25519") throw new AttestationError("signing_address_binding", "unsupported signing_algo");
  if (rd !== expectedReportData(a.signing_address, nonce, algo)) throw new AttestationError("signing_address_binding", "report_data address mismatch");
  const events = parseEvents(a.event_log);
  const imr3Digests = recomputeImr3Digests(events);
  const rtmr3 = replayRtmr(events);
  if (rtmr3 !== hex(q.rtmr3)) throw new AttestationError("rtmr3_replay", "RTMR3 mismatch");
  const { composeSha256, mrConfigId } = expectedMrConfigId(appComposeOf(a));
  if (mrConfigId !== hex(q.mrConfigId)) throw new AttestationError("compose_mrconfigid", "MRCONFIGID mismatch");
  // GPU: verify-if-present; require_gpu ⇒ absent = deny
  const hasGpu = a.nvidia_payload != null && a.nvidia_payload !== "";
  if (!hasGpu && d.policy.requireNvidiaEvidence) throw new AttestationError("nvidia", "nvidia_payload missing (require_gpu=true)");
  let nvidiaVerified = false, gpuSha256: string | undefined;
  if (hasGpu) {
    // PS residual 1: always DENY non-string nvidia_payload (cannot hash exact bytes), pin or not.
    if (typeof a.nvidia_payload !== "string") throw new AttestationError("nvidia", "nvidia_payload not an exact string");
    const g = await d.gpuVerifier.verifyGpu(a.nvidia_payload, nonce);
    if (!g.ok) throw new AttestationError("nvidia", g.reason ?? "gpu verify failed");
    nvidiaVerified = true;
    // Hash the exact nvidia_payload string as received (UTF-8). Never re-serialize a parsed object.
    if (typeof a.nvidia_payload === "string") gpuSha256 = sha256(Buffer.from(a.nvidia_payload, "utf8"));
    else if (d.allowlist.some((e) => e.model_id === modelId && e.gpu_evidence_sha256))
      throw new AttestationError("nvidia", "nvidia_payload not an exact string; cannot hash for GPU pin");
  }
  // G1: runtime compose_up/down are not in RTMR3; when CM evidence is present it must verify (present+fail ⇒ DENY).
  let composeManagerQuoteSha256: string | undefined;
  // G4: on the verified remote path CM evidence is REQUIRED; absent ⇒ DENY (compose_manager_missing).
  if (a.compose_manager_attestation == null)
    throw new AttestationError("compose_manager", "compose_manager_missing");
  composeManagerQuoteSha256 = (await verifyComposeManager(a.compose_manager_attestation, nonce, d.quoteVerifier, d.policy)).quoteSha256;
  if (d.policy.allowedMrTds && (!q.mrTd || !d.policy.allowedMrTds.includes(hex(q.mrTd))))
    throw new AttestationError("allowlist", "MRTD not allowlisted");
  const pins = matchPins(d.allowlist, { modelId, mrConfigId, composeSha256, rtmr3, gpuChecked: nvidiaVerified, gpuSha256,
    imr3Digests });
  if (pins.length === 0) throw new AttestationError("allowlist", "no exact allowlist pin");
  // Runtime compose pin (only after CM verify passed above): latest eligible compose_up.file_sha256 must equal each pinned entry.
  const composeFileSha256 = checkComposeFilePins(pins, (a.compose_manager_attestation as any).actions);
  // Multiple identical-pin release entries are fine; record the first.
  return { modelId, signingAddress: hex(a.signing_address), signingAlgo: algo, nonceHash: nonceHash(nonce), quoteSha256, composeSha256, rtmr3, mrConfigId,
    tcbStatus: q.tcbStatus, nvidiaVerified, candidateIndex: idx, ...(composeManagerQuoteSha256 ? { composeManagerQuoteSha256 } : {}), ...(composeFileSha256 ? { composeFileSha256 } : {}), verifiedAt: new Date().toISOString(), allowlistEntry: `${pins[0].effective_from}|${pins[0].privacy_security_approver}` };
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
