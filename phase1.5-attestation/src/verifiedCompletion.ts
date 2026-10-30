/**
 * Pre–Phase-2 item (7): completions path E2E skeleton (PRE_PHASE2_ACCEPTANCE.md §C).
 *
 * Ordering: [orchestrator sanitizer — NOT here] → assertReadyForRemoteInference(model) → POST completions
 * (canonical model, x-no-aliasing: true, exact bytes retained) → GET /v1/signature/<chat_id>?signing_algo=<preflight algo>
 * (bounded 404 retry) → assertBoundCompletion. Content is returned as verified ONLY after bind succeeds.
 *
 * The sanitizer is intentionally NOT inside this client: the caller/orchestrator MUST sanitize messages before calling
 * `complete()`. This client neither inspects nor logs prompt/completion content (digest-only logs).
 */
import { createHash } from "node:crypto";
import type { AttestationClient } from "./client.js";
import { DigestLogger } from "./digestLog.js";
import { assertBoundCompletion, ResponseBindingError, type ResponseSignatureBinder, type SignatureResponse, type SigningAlgo } from "./responseBinding.js";
import type { VerifiedAttestation } from "./types.js";

export type CompletionFetch = (url: string, init: { method: string; headers: Record<string, string>; body?: Uint8Array }) =>
  Promise<{ status: number; text(): Promise<string>; arrayBuffer?(): Promise<ArrayBuffer> }>;

export interface VerifiedCompletionClientOptions {
  attestation: Pick<AttestationClient, "assertReadyForRemoteInference">;
  binder: ResponseSignatureBinder;
  /** Default: provider TEE host (ATTEST_API_BASE). */
  baseUrl?: string;
  fetch: CompletionFetch;
  apiKey?: string;
  /** Bounded 404 retry for signature fetch. Default 3 attempts, 500ms apart. */
  signatureAttempts?: number;
  signatureRetryDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  logger?: DigestLogger;
}

export interface VerifiedCompletion {
  verified: true;
  chatId: string;
  /** Parsed response (parsed from the exact bytes that were hashed). */
  response: unknown;
  attestation: VerifiedAttestation;
  requestHash: string;
  responseHash: string;
}

export { ATTEST_API_BASE } from "./fetchReport.js";
import { ATTEST_API_BASE } from "./fetchReport.js";
const sha = (b: Uint8Array | string) => createHash("sha256").update(b).digest("hex");
const enc = new TextEncoder();

/** chat_id per NEAR docs = completion `id`; `chat_id` accepted as fallback. Missing/non-string ⇒ deny. */
export function extractChatId(parsed: unknown): string {
  const o = (parsed ?? {}) as Record<string, unknown>;
  for (const k of ["id", "chat_id"]) { const v = o[k]; if (typeof v === "string" && /^[A-Za-z0-9._:-]{1,256}$/.test(v)) return v; }
  throw new ResponseBindingError("chat_id_missing");
}

export class VerifiedCompletionClient {
  private readonly base: string; private readonly logger: DigestLogger;
  constructor(private readonly o: VerifiedCompletionClientOptions) {
    if (!o?.attestation || !o.binder || typeof o.fetch !== "function") throw new ResponseBindingError("client_misconfigured");
    this.base = (o.baseUrl ?? ATTEST_API_BASE).replace(/\/+$/, "");
    this.logger = o.logger ?? new DigestLogger();
  }

  /**
   * `body` must already be sanitized by the orchestrator. `body.model` is forced to the canonical `modelId`.
   * Throws (fail-closed) on any deny; never returns unverified content.
   */
  async complete(modelId: string, body: Record<string, unknown>): Promise<VerifiedCompletion> {
    const log = (result: "pass" | "fail", reason?: string, extra: Record<string, string> = {}) =>
      this.logger.log({ event: "completion_bind", modelId, nonceHash: "-", result, ...(reason ? { reason } : {}), ...extra });
    const deny = (reason: string, extra: Record<string, string> = {}): never => { log("fail", reason, extra); throw new ResponseBindingError(reason); };

    // 1. Preflight retain set (throws if assertReady never succeeded / empty / expired).
    let retained: readonly VerifiedAttestation[];
    try { retained = this.o.attestation.assertReadyForRemoteInference(modelId); } catch { return deny("no_verified_attestation"); }
    if (!retained || retained.length === 0) return deny("no_verified_attestation");
    const algos = new Set(retained.map((v) => v.signingAlgo ?? "ecdsa"));
    if (algos.size !== 1) return deny("signing_algo_ambiguous");
    const signingAlgo = [...algos][0] as SigningAlgo;

    // 2. Completion — exact request bytes are the bytes sent.
    const requestBody = enc.encode(JSON.stringify({ ...body, model: modelId }));
    const headers: Record<string, string> = { "content-type": "application/json", "x-no-aliasing": "true", "accept-encoding": "identity" };
    if (this.o.apiKey) headers.authorization = `Bearer ${this.o.apiKey}`;
    let responseBody: Uint8Array, parsed: unknown;
    try {
      const r = await this.o.fetch(`${this.base}/v1/chat/completions`, { method: "POST", headers, body: requestBody });
      if (r.status !== 200) return deny("completion_http_error");
      responseBody = r.arrayBuffer ? new Uint8Array(await r.arrayBuffer()) : enc.encode(await r.text());
      parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(responseBody));
    } catch (e) { if (e instanceof ResponseBindingError) throw e; return deny("completion_fetch_failed"); }
    const hashes = { requestHash: sha(requestBody), responseHash: sha(responseBody) };
    let chatId: string;
    try { chatId = extractChatId(parsed); } catch { return deny("chat_id_missing", hashes); }

    // 3. Signature, bounded 404 retry, explicit algo.
    const signature = await this.fetchSignature(chatId, signingAlgo);

    // 4. Bind — only then verified.
    let attestation: VerifiedAttestation;
    try {
      attestation = await assertBoundCompletion(retained, { modelId, requestBody, responseBody, requestHeaders: headers, signingAlgo, signature }, this.o.binder);
    } catch (e) { return deny(e instanceof ResponseBindingError ? e.reason : "bind_error", hashes); }
    log("pass", undefined, { ...hashes, signingAlgo, signingAddressSha256: sha(attestation.signingAddress.toLowerCase().replace(/^0x/, "")) });
    return { verified: true, chatId, response: parsed, attestation, ...hashes };
  }

  private async fetchSignature(chatId: string, algo: SigningAlgo): Promise<SignatureResponse | null> {
    const attempts = Math.min(Math.max(this.o.signatureAttempts ?? 3, 1), 5);
    const delay = this.o.signatureRetryDelayMs ?? 500;
    const sleep = this.o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
    const headers: Record<string, string> = { "accept-encoding": "identity" };
    if (this.o.apiKey) headers.authorization = `Bearer ${this.o.apiKey}`;
    const url = `${this.base}/v1/signature/${encodeURIComponent(chatId)}?signing_algo=${algo}`;
    for (let i = 0; i < attempts; i++) {
      try {
        const r = await this.o.fetch(url, { method: "GET", headers });
        if (r.status === 200) { const j = JSON.parse(await r.text()); return j && typeof j === "object" ? (j as SignatureResponse) : null; }
        if (r.status !== 404) return null;
      } catch { return null; }
      if (i < attempts - 1) await sleep(delay);
    }
    return null;
  }
}
