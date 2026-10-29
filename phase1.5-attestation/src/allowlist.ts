import { readFileSync } from "node:fs";
import type { AllowlistEntry } from "./types.js";
import { AttestationError } from "./types.js";

const H = (s: unknown) => (typeof s === "string" ? s.toLowerCase().replace(/^0x/, "") : undefined);

export interface LoadAllowlistOptions {
  /** Must be exactly true to load test_only entries. Ignored (forced false) when NODE_ENV=production. */
  allowTestOnly?: boolean;
  env?: Record<string, string | undefined>;
}

/** Validate + filter parsed allowlist JSON. Returns non-empty list or throws (deny-all). */
export function parseAllowlist(raw: unknown, opts: LoadAllowlistOptions = {}): AllowlistEntry[] {
  const env = opts.env ?? process.env;
  const allowTest = opts.allowTestOnly === true && env.NODE_ENV !== "production";
  const list = (raw as { entries?: unknown })?.entries;
  if (!Array.isArray(list)) throw new AttestationError("allowlist_load", "allowlist malformed (no entries[])");
  const out: AllowlistEntry[] = [];
  list.forEach((e: any, i) => {
    const bad = (why: string) => { throw new AttestationError("allowlist_load", `entry ${i}: ${why}`); };
    if (!e || typeof e !== "object") bad("not an object");
    if (typeof e.model_id !== "string" || !e.model_id) bad("model_id required");
    if (!H(e.mrconfigid) && !H(e.app_compose_sha256)) bad("mrconfigid or app_compose_sha256 required");
    if (!/^[0-9a-f]{96}$/.test(H(e.rtmr3) ?? "")) bad("rtmr3 must be 48-byte hex");
    if (typeof e.effective_from !== "string" || isNaN(Date.parse(e.effective_from))) bad("effective_from required");
    if (typeof e.privacy_security_approver !== "string" || !e.privacy_security_approver) bad("privacy_security_approver required");
    if (typeof e.notes !== "string") bad("notes required");
    let cfs: string | undefined;
    if (e.compose_file_sha256 !== undefined && e.compose_file_sha256 !== null && e.compose_file_sha256 !== "") {
      cfs = H(e.compose_file_sha256);
      if (!/^[0-9a-f]{64}$/.test(cfs ?? "")) bad("compose_file_sha256 must be 32-byte hex");
    }
    if (e.test_only === true && !allowTest) return; // never loads in prod / without explicit opt-in
    out.push({ ...e, mrconfigid: H(e.mrconfigid), app_compose_sha256: H(e.app_compose_sha256), rtmr3: H(e.rtmr3)!,
      event_log_digests: e.event_log_digests?.map(H), gpu_evidence_sha256: H(e.gpu_evidence_sha256), compose_file_sha256: cfs });
  });
  if (out.length === 0) throw new AttestationError("allowlist_load", "allowlist empty (deny-all)");
  return out;
}

/** Local file only (no network fetch). Missing/unreadable/empty → DENY. */
export function loadAllowlist(path: string, opts: LoadAllowlistOptions = {}): AllowlistEntry[] {
  let raw: unknown;
  try { raw = JSON.parse(readFileSync(path, "utf8")); }
  catch { throw new AttestationError("allowlist_load", "allowlist file missing or unreadable"); }
  return parseAllowlist(raw, opts);
}

export interface PinCandidate { modelId: string; mrConfigId: string; composeSha256: string; rtmr3: string; imr3Digests: string[]; gpuSha256?: string; gpuChecked: boolean }

/** Exact pin match. Returns all matching entries (0 → DENY at caller; multiple OK — caller takes first). */
export function matchPins(entries: AllowlistEntry[], c: PinCandidate, now = Date.now()): AllowlistEntry[] {
  return entries.filter((e) =>
    e.model_id === c.modelId &&
    Date.parse(e.effective_from) <= now &&
    (e.mrconfigid === undefined || e.mrconfigid === c.mrConfigId) &&
    (e.app_compose_sha256 === undefined || e.app_compose_sha256 === c.composeSha256) &&
    e.rtmr3 === c.rtmr3 &&
    (!e.event_log_digests || (e.event_log_digests.length === c.imr3Digests.length && e.event_log_digests.every((d, i) => d === c.imr3Digests[i]))) &&
    (!e.gpu_evidence_sha256 || (c.gpuChecked && e.gpu_evidence_sha256 === c.gpuSha256)));
}

/** Latest eligible compose_up file_sha256 from CM actions: action==="compose_up", non-empty file_sha256,
 *  valid ISO timestamp; latest = max Date.parse(timestamp) (ties: later array position wins). Undefined if none. */
export function latestComposeUpFileSha256(actions: unknown): string | undefined {
  if (!Array.isArray(actions)) return undefined;
  let best: { t: number; h: string } | undefined;
  for (const a of actions as any[]) {
    if (!a || a.action !== "compose_up" || typeof a.file_sha256 !== "string" || !a.file_sha256) continue;
    if (typeof a.timestamp !== "string") continue;
    const t = Date.parse(a.timestamp); if (isNaN(t)) continue;
    if (!best || t >= best.t) best = { t, h: a.file_sha256.toLowerCase().replace(/^0x/, "") };
  }
  return best?.h;
}

/** Enforce compose_file_sha256 for every matched entry carrying a pin (fail-closed). Returns observed digest when enforced. */
export function checkComposeFilePins(pins: AllowlistEntry[], actions: unknown): string | undefined {
  const pinned = pins.filter((e) => e.compose_file_sha256);
  if (pinned.length === 0) return undefined;
  const obs = latestComposeUpFileSha256(actions);
  if (!obs) throw new AttestationError("compose_manager", "compose_file_sha256_missing_up");
  for (const e of pinned) if (e.compose_file_sha256 !== obs)
    throw new AttestationError("compose_manager", `compose_file_sha256_mismatch (observed ${obs.slice(0, 8)}…)`);
  return obs;
}
