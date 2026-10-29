/**
 * Digest-only structured logger (ATTESTATION_ACCEPTANCE.md §3).
 * Closed type + runtime key allowlist. Raw nonce is NOT loggable — only nonceHash (sha256 of nonce).
 */
import { createHash } from "node:crypto";

export const nonceHash = (nonce: string): string => createHash("sha256").update(nonce, "utf8").digest("hex");

export interface DigestLogRecord {
  event: "attestation_verify" | "completion_bind";
  requestHash?: string;
  responseHash?: string;
  modelId: string;
  nonceHash: string;
  result: "pass" | "fail";
  provider?: string;
  signingAlgo?: string;
  scope?: "gateway" | "model";
  candidateIndex?: string;
  check?: string;
  reason?: string;
  signingAddressSha256?: string;
  quoteSha256?: string;
  composeSha256?: string;
  rtmr3?: string;
  mrConfigId?: string;
  tcbStatus?: string;
  // Compile-time bans.
  nonce?: never; prompt?: never; completion?: never; messages?: never; content?: never;
  apiKey?: never; api_key?: never; authorization?: never;
}

const ALLOWED = new Set([
  "event", "modelId", "nonceHash", "result", "provider", "signingAlgo", "scope", "candidateIndex", "check", "reason",
  "signingAddressSha256", "quoteSha256", "composeSha256", "rtmr3", "mrConfigId", "tcbStatus", "requestHash", "responseHash",
]);
const FORBIDDEN = /prompt|completion|message|content|api_?key|token|secret|authorization|bearer|password|^nonce$/i;

export class DigestLogError extends Error {}
export type DigestSink = (line: string) => void;

export class DigestLogger {
  readonly records: DigestLogRecord[] = [];
  constructor(private readonly sink: DigestSink = (l) => console.log(l)) {}

  log(record: DigestLogRecord): void {
    for (const k of Object.keys(record)) {
      if (FORBIDDEN.test(k) || !ALLOWED.has(k)) throw new DigestLogError(`digest log rejects field '${k}'`);
    }
    for (const v of Object.values(record)) {
      if (typeof v !== "string") throw new DigestLogError("digest log values must be strings");
      if (/bearer\s|sk-[a-z0-9]/i.test(v)) throw new DigestLogError("digest log value looks like a credential");
      if (v.length > 256) throw new DigestLogError("digest log value too long (digests only)");
    }
    const frozen = Object.freeze({ ...record, ts: new Date().toISOString() });
    this.records.push(frozen);
    this.sink(JSON.stringify(frozen));
  }
}
