import { createHash } from "node:crypto";
import type { MeasurementPolicy } from "./types.js";
import { AttestationError } from "./types.js";
import type { QuoteVerifier } from "./quoteVerifier.js";

const hex = (s: string) => s.toLowerCase().replace(/^0x/, "");
const is32 = (s: unknown): s is string => typeof s === "string" && /^[0-9a-f]{64}$/.test(hex(s));

export interface ComposeManagerAttestation {
  actions?: unknown[]; actions_hash?: string; nonce?: string; nonce_source?: string;
  quote?: string; report_data?: string; event_log?: unknown; vm_config?: string; [k: string]: unknown;
}
export interface ComposeUpRecord { timestamp?: string; file?: string; file_sha256?: string; tag?: string; commit?: string; services?: string[] }
export interface ComposeManagerSummary {
  quoteSha256: string; tcbStatus: string; actionsCount: number;
  latestComposeUp: ComposeUpRecord | null; composeManagerImages: string[]; vmConfigImage?: string;
}

/** G1 (SECURITY_SIGNOFF_PRE_PHASE2_ITEM6_DRAFT_REVIEW.md): report_data = actions_hash(32) ‖ request_nonce(32). */
export function expectedComposeManagerReportData(actionsHash: string, nonce: string): string {
  if (!is32(actionsHash)) throw new AttestationError("compose_manager", "actions_hash must be 32 bytes hex");
  if (!is32(nonce)) throw new AttestationError("nonce_binding", "nonce must be 32 bytes");
  return hex(actionsHash) + hex(nonce);
}

/** Record-only summary (human review). actions_hash is append-only and is NEVER a pin. */
export function summarizeComposeManager(cm: ComposeManagerAttestation): Omit<ComposeManagerSummary, "quoteSha256" | "tcbStatus"> {
  const actions = Array.isArray(cm.actions) ? (cm.actions as any[]) : [];
  const ups = actions.filter((a) => a && a.action === "compose_up");
  const last = ups.at(-1);
  const imgs = [...new Set(actions.map((a) => a?.image).filter((i) => typeof i === "string" && i.includes("compose-manager")))] as string[];
  let vmConfigImage: string | undefined;
  try { vmConfigImage = typeof cm.vm_config === "string" ? JSON.parse(cm.vm_config)?.image : undefined; } catch {}
  return { actionsCount: actions.length, composeManagerImages: imgs, vmConfigImage,
    latestComposeUp: last ? { timestamp: last.timestamp, file: last.file, file_sha256: last.file_sha256, tag: last.tag, commit: last.commit, services: last.services } : null };
}

/**
 * G1: when compose_manager_attestation is present it MUST verify; present+fail ⇒ DENY.
 * DCAP quote (debug rejected by DcapQuoteVerifier), TCB/advisory policy, nonce == client nonce (nonce_source=client),
 * quote.report_data === actions_hash ‖ nonce, and the echoed report_data field (if any) must agree.
 */
export async function verifyComposeManager(cm: unknown, nonce: string, qv: QuoteVerifier,
  policy: Pick<MeasurementPolicy, "allowedTcbStatuses" | "allowedAdvisoryIds">): Promise<ComposeManagerSummary> {
  if (!cm || typeof cm !== "object" || Array.isArray(cm)) throw new AttestationError("compose_manager", "compose_manager_attestation malformed");
  const c = cm as ComposeManagerAttestation;
  if (typeof c.quote !== "string" || !c.quote) throw new AttestationError("compose_manager", "cm quote missing");
  if (c.nonce_source !== "client") throw new AttestationError("compose_manager", "cm nonce_source not client");
  if (typeof c.nonce !== "string" || hex(c.nonce) !== hex(nonce)) throw new AttestationError("compose_manager", "cm nonce mismatch");
  if (!Array.isArray(c.actions)) throw new AttestationError("compose_manager", "cm actions missing");
  const exp = expectedComposeManagerReportData(c.actions_hash ?? "", nonce);
  if (c.report_data != null && hex(String(c.report_data)) !== exp) throw new AttestationError("compose_manager", "cm report_data field mismatch");
  const q = await qv.verifyQuote(c.quote);
  if (!q.ok) throw new AttestationError("compose_manager", `cm_quote:${q.reason}`);
  if (!policy.allowedTcbStatuses.includes(q.tcbStatus)) throw new AttestationError("compose_manager", `cm tcb ${q.tcbStatus}`);
  if (q.advisoryIds.some((a) => !policy.allowedAdvisoryIds.includes(a))) throw new AttestationError("compose_manager", "cm advisories");
  if (hex(q.reportData) !== exp) throw new AttestationError("compose_manager", "cm quote report_data != actions_hash‖nonce");
  return { quoteSha256: createHash("sha256").update(Buffer.from(hex(c.quote), "hex")).digest("hex"), tcbStatus: q.tcbStatus, ...summarizeComposeManager(c) };
}
