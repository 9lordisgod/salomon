/** Raw shapes from GET /v1/attestation/report (fields we rely on; unknown fields ignored). */
export interface EventLogEntry {
  imr: number;
  digest?: string; // hex SHA-384; may be empty (recomputed per NEAR docs)
  event_type?: number;
  event?: string;
  event_payload?: string;
}

export interface ModelAttestation {
  signing_address: string; // hex, 0x-prefixed (ECDSA / Ethereum-style 20 bytes)
  signing_algo?: string;
  intel_quote: string; // hex TDX quote
  /** Callers MUST pass the original JSON string as received; objects cannot satisfy a gpu_evidence_sha256 pin. */
  nvidia_payload?: string | Record<string, unknown> | null;
  event_log?: EventLogEntry[] | string; // may arrive JSON-encoded
  info?: { app_compose?: string; [k: string]: unknown };
  app_compose?: string;
  request_nonce?: string;
  model?: string;
  [k: string]: unknown;
}

export interface AttestationReport {
  model_attestations?: ModelAttestation[];
  gateway_attestation?: ModelAttestation | Record<string, unknown> | null;
  [k: string]: unknown;
}

/** Fields the QuoteVerifier extracts from a cryptographically verified quote. */
export interface VerifiedQuote {
  ok: true;
  tcbStatus: string; // e.g. "UpToDate"
  advisoryIds: string[];
  reportData: string; // hex, 64 bytes
  rtmr3: string; // hex, 48 bytes
  mrConfigId: string; // hex, 48 bytes
  mrTd?: string;
  rtmr0?: string; rtmr1?: string; rtmr2?: string;
}
export interface QuoteFailure { ok: false; reason: string }
export type QuoteResult = VerifiedQuote | QuoteFailure;

export interface MeasurementPolicy {
  /** Require model_attestations[] non-empty (default true). */
  requireModelAttestations: boolean;
  /** Accepted TCB statuses. TODO(Privacy Security): finalize. */
  allowedTcbStatuses: string[];
  /** Advisory IDs that are tolerated. Empty = any advisory denies. */
  allowedAdvisoryIds: string[];
  /** Optional exact MRTD pins (lowercase hex). If set, MRTD must match. */
  allowedMrTds?: string[];
  /** require_gpu. Default false (locked Decision 1): verify-if-present; true ⇒ payload absent = DENY. */
  requireNvidiaEvidence: boolean;
}

export interface VerifiedAttestation {
  modelId: string;
  signingAddress: string;
  /** signing_algo used at preflight (provider_tee must match). */
  signingAlgo?: "ecdsa" | "ed25519";
  nonceHash: string;
  quoteSha256: string;
  composeSha256: string;
  rtmr3: string;
  mrConfigId: string;
  tcbStatus: string;
  nvidiaVerified: boolean;
  candidateIndex: number;
  /** G1: compose-manager quote sha256 when present+verified (record only). */
  composeManagerQuoteSha256?: string;
  /** Observed CM latest compose_up file_sha256 (digest only), recorded when a compose_file_sha256 pin was enforced. */
  composeFileSha256?: string;
  allowlistEntry: string; // effective_from|notes id of the matched pin
  verifiedAt: string;
}

export type CheckName =
  | "evidence_present" | "quote" | "tcb_policy" | "nonce_binding" | "signing_address_binding"
  | "rtmr3_replay" | "compose_mrconfigid" | "nvidia" | "allowlist" | "allowlist_load" | "gateway" | "skip_attest_banned" | "unwired_plug" | "fetch" | "compose_manager";

export class AttestationError extends Error {
  constructor(public readonly check: CheckName, public readonly reason: string) {
    super(`attestation denied [${check}]: ${reason}`);
    this.name = "AttestationError";
  }
}

/** allowlist/measurements.json entry (ATTESTATION_ACCEPTANCE.md §4). */
export interface AllowlistEntry {
  model_id: string;
  mrconfigid?: string;          // lowercase hex, no 0x (48 bytes)
  app_compose_sha256?: string;  // lowercase hex
  rtmr3: string;                // exact pin
  event_log_digests?: string[]; // exact IMR3 digests, in order
  gpu_evidence_sha256?: string; // optional GPU pin: sha256 of the exact nvidia_payload string (UTF-8 bytes as received)
  /** Optional runtime pin (SECURITY_ACCEPTANCE_COMPOSE_FILE_SHA256.md): exact match to CM-reported file_sha256 of the
   *  latest eligible compose_up. 64 lowercase hex. Absent/empty ⇒ not enforced. Never re-hashes boot app_compose. */
  compose_file_sha256?: string;
  effective_from: string;       // ISO date
  notes: string;
  privacy_security_approver: string;
  test_only?: boolean;
}
export interface AllowlistFile { entries: AllowlistEntry[] }
