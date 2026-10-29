import { createHash } from "node:crypto";
import type { VerifiedAttestation } from "./types.js";
import { assertPlugsProductionReady, productionPlugsRequired } from "./productionGuard.js";

/** Locked per PRE_PHASE2_ACCEPTANCE.md §C. */
export type SigningAlgo = "ecdsa" | "ed25519";

/** Body of GET /v1/signature/<chat_id>?signing_algo=<algo>. */
export interface SignatureResponse {
  text?: string;
  signature?: string;
  signing_address?: string;
  signing_algo?: string;
  signature_kind?: string;
  error_code?: string;
}

export interface CompletionEvidence {
  /** Canonical model id from the ORIGINAL request. */
  modelId: string;
  /** Exact request/response body bytes (never re-serialized). Hashed only; never logged. */
  requestBody: Uint8Array;
  responseBody: Uint8Array;
  requestHeaders: Record<string, string | undefined>;
  /** Algo used at attestation preflight (must equal signature algo). */
  signingAlgo: SigningAlgo;
  /** Null ⇒ signature missing after bounded retry. */
  signature: SignatureResponse | null;
}

export type BindingResult = { ok: true; attestation: VerifiedAttestation; digest: BindingDigest } | { ok: false; reason: string; digest?: BindingDigest };
export interface BindingDigest { modelId: string; algo: string; requestHash: string; responseHash: string; signerSha256?: string; reason?: string }

/** Crypto plug: ecdsa = EIP-191 recover vs address; ed25519 = verify with address as pubkey. */
export interface ResponseSignatureBinder {
  readonly name: string;
  verify(text: string, signature: string, signingAddress: string, algo: SigningAlgo): Promise<{ ok: boolean; reason?: string }>;
}

/** Default. ALWAYS denies. Real EIP-191/ed25519 binder not wired (pending PS sign-off). */
export class StubFailClosedResponseBinder implements ResponseSignatureBinder {
  readonly name = "stub-fail-closed-response-binder";
  async verify(): Promise<{ ok: boolean; reason?: string }> { return { ok: false, reason: "response_binder_not_configured" }; }
}

export class ResponseBindingError extends Error {
  constructor(public readonly reason: string, public readonly digest?: BindingDigest) { super(`provider_tee binding denied: ${reason}`); this.name = "ResponseBindingError"; }
}

const sha256 = (b: Uint8Array | string) => createHash("sha256").update(b).digest("hex");
const norm = (a: string) => a.toLowerCase().replace(/^0x/, "");

export function expectedSignedText(modelId: string, requestBody: Uint8Array, responseBody: Uint8Array): string {
  return `${modelId}:${sha256(requestBody)}:${sha256(responseBody)}`;
}

/**
 * provider_tee binding. VERIFIED only if retained preflight set (from assertReadyForRemoteInference) is non-empty,
 * and the signature uniquely binds to exactly ONE retained model report with same address + algo.
 * Errors/digests carry hashes + reason codes only.
 */
export async function bindCompletion(
  verified: readonly VerifiedAttestation[],
  ev: CompletionEvidence,
  binder: ResponseSignatureBinder = new StubFailClosedResponseBinder(),
): Promise<BindingResult> {
  const digest: BindingDigest = { modelId: ev.modelId, algo: ev.signingAlgo, requestHash: sha256(ev.requestBody), responseHash: sha256(ev.responseBody) };
  const deny = (reason: string): BindingResult => ({ ok: false, reason, digest: { ...digest, reason } });
  if (!verified || verified.length === 0) return deny("no_verified_attestation");
  if (ev.requestHeaders["x-no-aliasing"] !== "true") return deny("missing_x_no_aliasing");
  if (verified.some((v) => v.modelId !== ev.modelId)) return deny("model_id_mismatch");
  const s = ev.signature;
  if (!s || s.error_code || !s.signature || !s.text) return deny("signature_missing");
  if (s.signature_kind === "gateway") return deny("gateway_signature_only");
  if (s.signature_kind !== "provider_tee") return deny("signature_kind_unrecognized");
  if (s.signing_algo !== ev.signingAlgo) return deny("signing_algo_mismatch");
  if (s.text !== `${ev.modelId}:${digest.requestHash}:${digest.responseHash}`) return deny("signed_text_mismatch");
  const cands = verified.filter((v) => (v.signingAlgo ?? "ecdsa") === ev.signingAlgo && (!s.signing_address || norm(v.signingAddress) === norm(s.signing_address)));
  const matches: VerifiedAttestation[] = [];
  for (const v of cands) {
    const r = await binder.verify(s.text, s.signature, v.signingAddress, ev.signingAlgo);
    if (!r.ok && r.reason === "response_binder_not_configured") return deny(r.reason);
    if (r.ok) matches.push(v);
  }
  if (matches.length === 0) return deny("signer_match_none");
  if (matches.length > 1) return deny("signer_match_ambiguous");
  return { ok: true, attestation: matches[0]!, digest: { ...digest, signerSha256: sha256(norm(matches[0]!.signingAddress)) } };
}

/** Throwing form. */
export async function assertBoundCompletion(verified: readonly VerifiedAttestation[], ev: CompletionEvidence, binder?: ResponseSignatureBinder): Promise<VerifiedAttestation> {
  if (productionPlugsRequired(process.env)) {
    try { assertPlugsProductionReady({ responseBinder: binder }, { bindOnly: true }); }
    catch { throw new ResponseBindingError("unwired_plug_forbidden_in_production"); }
  }
  const r = await bindCompletion(verified, ev, binder);
  if (!r.ok) throw new ResponseBindingError(r.reason, r.digest);
  return r.attestation;
}
