import type { AllowlistEntry, MeasurementPolicy, VerifiedAttestation } from "./types.js";
import { AttestationError } from "./types.js";
import { generateNonce } from "./nonce.js";
import { fetchAttestationReport, type FetchReportOptions } from "./fetchReport.js";
import { StubFailClosedVerifier, type GatewayVerifier, type GpuVerifier, type QuoteVerifier } from "./quoteVerifier.js";
import { DEFAULT_POLICY, verifyReport } from "./verify.js";
import { DigestLogger, nonceHash } from "./digestLog.js";
import { loadAllowlist } from "./allowlist.js";
import { fileURLToPath } from "node:url";

export const DEFAULT_ALLOWLIST_PATH = fileURLToPath(new URL("../allowlist/measurements.json", import.meta.url));
const BANNED_SKIP_FLAGS = ["SKIP_ATTEST", "ALLOW_NO_ATTEST", "NEAR_SKIP_ATTEST", "ATTEST_SKIP"];

export interface AttestationClientOptions extends FetchReportOptions {
  quoteVerifier?: QuoteVerifier;     // default: stub (deny)
  gpuVerifier?: GpuVerifier;         // default: stub (deny if payload present)
  gatewayVerifier?: GatewayVerifier; // default: stub (deny)
  policy?: MeasurementPolicy;
  logger?: DigestLogger;
  /** Path via config, else env NEAR_ATTEST_ALLOWLIST_PATH, else allowlist/measurements.json. */
  allowlistPath?: string;
  /** Must be exactly true to load test_only pins; ignored when NODE_ENV=production. */
  allowTestOnly?: boolean;
  maxAgeMs?: number; // TODO(Privacy Security): TTL / re-attest cadence
}

/** Preflight-only gate. Remote inference NOT wired; Phase 2 completions must call assertReadyForRemoteInference first. */
export class AttestationClient {
  private readonly verified = new Map<string, { at: number; set: readonly VerifiedAttestation[] }>();
  private readonly qv: QuoteVerifier; private readonly gv: GpuVerifier; private readonly gwv: GatewayVerifier;
  private readonly policy: MeasurementPolicy; private readonly logger: DigestLogger; private readonly maxAgeMs: number;

  constructor(private readonly opts: AttestationClientOptions = {}) {
    const env = opts.env ?? process.env;
    for (const f of BANNED_SKIP_FLAGS) if (env[f]) throw new AttestationError("skip_attest_banned", `${f} is not honored; refusing to start`);
    const stub = new StubFailClosedVerifier();
    this.qv = opts.quoteVerifier ?? stub; this.gv = opts.gpuVerifier ?? stub; this.gwv = opts.gatewayVerifier ?? stub;
    this.policy = opts.policy ?? DEFAULT_POLICY; this.logger = opts.logger ?? new DigestLogger();
    this.maxAgeMs = opts.maxAgeMs ?? 5 * 60_000;
  }

  private allowlist(): AllowlistEntry[] {
    const env = this.opts.env ?? process.env;
    const path = this.opts.allowlistPath ?? env.NEAR_ATTEST_ALLOWLIST_PATH ?? DEFAULT_ALLOWLIST_PATH;
    return loadAllowlist(path, { allowTestOnly: this.opts.allowTestOnly, env });
  }

  async verifyForModel(modelId: string): Promise<readonly VerifiedAttestation[]> {
    this.verified.delete(modelId);
    const nonce = generateNonce();
    const fail = (err: AttestationError) => {
      this.logger.log({ event: "attestation_verify", modelId, nonceHash: nonceHash(nonce), result: "fail", check: err.check, reason: err.reason });
      return err;
    };
    let allowlist: AllowlistEntry[];
    try { allowlist = this.allowlist(); } catch (e) { throw fail(e as AttestationError); }
    let report;
    try { report = await fetchAttestationReport(modelId, nonce, this.opts); }
    catch (e) { throw fail(e instanceof AttestationError ? e : new AttestationError("fetch", "fetch failed")); }
    const set = await verifyReport(report, modelId, nonce, { quoteVerifier: this.qv, gpuVerifier: this.gv,
      gatewayVerifier: this.gwv, policy: this.policy, allowlist, logger: this.logger });
    const frozen = Object.freeze([...set]);
    this.verified.set(modelId, { at: Date.now(), set: frozen });
    return frozen;
  }

  getVerified(modelId: string) { return this.verified.get(modelId)?.set; }

  assertReadyForRemoteInference(modelId: string): readonly VerifiedAttestation[] {
    const v = this.verified.get(modelId);
    if (!v || v.set.length === 0) throw new AttestationError("evidence_present", "model not attested");
    if (Date.now() - v.at > this.maxAgeMs) { this.verified.delete(modelId); throw new AttestationError("evidence_present", "attestation expired; re-verify"); }
    return v.set;
  }
}
