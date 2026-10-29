import type { AttestationReport } from "./types.js";
import { AttestationError } from "./types.js";

export const NEAR_AI_CLOUD_BASE = "https://cloud-api.near.ai/v1";
export type FetchLike = (url: string, init: { method: string; headers: Record<string, string> }) =>
  Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export interface FetchReportOptions {
  baseUrl?: string;
  fetchImpl?: FetchLike;
  /** Only for tests; production reads NEAR_AI_CLOUD_API_KEY from env. */
  env?: Record<string, string | undefined>;
}

/** Preflight fetch of the attestation report. Never logs or returns the API key. */
export async function fetchAttestationReport(
  modelId: string, nonce: string, opts: FetchReportOptions = {},
): Promise<AttestationReport> {
  const env = opts.env ?? process.env;
  const key = env.NEAR_AI_CLOUD_API_KEY;
  if (!key) throw new AttestationError("fetch", "NEAR_AI_CLOUD_API_KEY not set");
  if (!/^[0-9a-f]{64}$/.test(nonce)) throw new AttestationError("fetch", "nonce must be 32-byte hex");
  const q = new URLSearchParams({
    model: modelId, provider: "near", signing_algo: "ecdsa", nonce, include_tls_fingerprint: "false",
  });
  const url = `${opts.baseUrl ?? NEAR_AI_CLOUD_BASE}/attestation/report?${q}`;
  const f: FetchLike = opts.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
  let res;
  try {
    res = await f(url, {
      method: "GET",
      headers: { Accept: "application/json", "x-no-aliasing": "true", Authorization: `Bearer ${key}` },
    });
  } catch {
    throw new AttestationError("fetch", "network error"); // do not echo error (may contain headers)
  }
  if (!res.ok) throw new AttestationError("fetch", `http ${res.status}`);
  let body: unknown;
  try { body = await res.json(); } catch { throw new AttestationError("fetch", "invalid json"); }
  if (!body || typeof body !== "object") throw new AttestationError("fetch", "report not an object");
  return body as AttestationReport;
}
