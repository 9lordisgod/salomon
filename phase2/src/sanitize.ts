/**
 * Orchestrator sanitizer — TS port of the signed Python stub privacy/sanitizer.py + privacy/secret_heuristics.py
 * (same regexes, same order, same reason strings). Contract: secrets → reject in EVERY mode; addresses → redact
 * (or reject in mode=reject); internal error → fail-closed. Parity enforced by test/sanitizer.parity.test.ts which
 * runs the Python reference on shared vectors. Never logs content.
 * TS-only extra (stricter, applied after parity pass): ed25519:/secp256k1: public-key-looking strings (32+ base58) → [REDACTED_KEY].
 */
export interface ChatMessage { role: "system" | "user" | "assistant" | "tool"; content: string | null; tool_calls?: unknown; tool_call_id?: string; name?: string }
export type Sanitizer = (msgs: readonly ChatMessage[]) => ChatMessage[];
export interface SanitizerConfig { stripAddresses?: boolean; mode?: "redact" | "reject"; /** TS-only; internal use for wrapped role:tool envelopes */ relaxBlobRules?: boolean }
export interface Redaction { kind: string; placeholder: string }
export interface SanitizeResult { ok: boolean; text: string; redactions: Redaction[]; reasons: string[] }

const IMPLICIT_RX = /\b(?:account|receiver|recipient|implicit|address|to)\b[\s:=]*(?<![0-9a-f])([0-9a-f]{64})(?![0-9a-fA-F])/gi;
const NAMED_RX = /(?<![\w.-])(?:[a-z0-9_-]+\.)*[a-z0-9_-]+\.(?:near|testnet)\b/g;
const EVM_RX = /(?<![0-9a-fA-Fx])0x[0-9a-fA-F]{40}(?![0-9a-fA-F])/g;
const ADDRESS_RULES: [string, RegExp, string][] = [
  ["near_implicit_account", IMPLICIT_RX, "[NEAR_IMPLICIT]"], ["near_named_account", NAMED_RX, "[NEAR_ACCOUNT]"], ["evm_address", EVM_RX, "[EVM_ADDRESS]"]];

const STOP = new Set("the and of to is in for that with you it are be as on by or an this from at not".split(" "));
const WORD_RUN = /(?:\b[a-z]{3,8}\b[ \t,\-]+){11,}\b[a-z]{3,8}\b/g;
const SECRET_PATTERNS: [string, RegExp][] = [
  ["pem_private_key", /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/],
  ["hex_key_64+", /(?<![0-9a-fA-F])(?:0x)?[0-9a-fA-F]{64,}(?![0-9a-fA-F])/],
  ["near_ed25519_secret", /ed25519:[1-9A-HJ-NP-Za-km-z]{80,}/],
  ["api_key_sk", /\bsk-[A-Za-z0-9_\-]{16,}/],
  ["api_key_assignment", /\bapi[_-]?key\b\s*[:=]\s*['"]?[A-Za-z0-9_\-]{12,}/i],
  ["base64_blob", /(?<![A-Za-z0-9+/])[A-Za-z0-9+/]{60,}={0,2}(?![A-Za-z0-9+/=])/],
];
function bip39Like(t: string): boolean {
  for (const m of t.matchAll(WORD_RUN)) {
    const w = m[0].match(/[a-z]+/g) ?? [];
    for (let i = 0; i < w.length - 11; i++) if (w.slice(i, i + 12).filter((x) => STOP.has(x)).length <= 1) return true;
  }
  return false;
}
/** Blob-shaped rules that false-positive on public chain data (view_state values, hashes, borsh bytes). */
export const ENVELOPE_RELAXED_RULES: ReadonlySet<string> = new Set(["base64_blob", "hex_key_64+"]);
export function scanText(t: string, skip: ReadonlySet<string> = new Set()): string[] {
  const r = SECRET_PATTERNS.filter(([n, rx]) => !skip.has(n) && rx.test(t)).map(([n]) => n);
  if (bip39Like(t)) r.push("bip39_like_12+_word_run");
  return r;
}

export function sanitizeForRemote(text: unknown, cfg: SanitizerConfig = {}): SanitizeResult {
  const rej = (reasons: string[], redactions: Redaction[] = []): SanitizeResult => ({ ok: false, text: "", redactions, reasons });
  try {
    const mode = cfg.mode ?? "redact"; const strip = cfg.stripAddresses ?? true;
    if (mode !== "redact" && mode !== "reject") return rej([`bad_mode:${mode}`]);
    if (typeof text !== "string") return rej(["non_string_input"]);
    const redactions: Redaction[] = []; let out = text;
    if (strip) for (const [kind, rx, ph] of ADDRESS_RULES) {
      out = out.replace(rx, (m0: string, g1?: unknown) => {
        redactions.push({ kind, placeholder: ph });
        return typeof g1 === "string" ? m0.slice(0, m0.length - g1.length) + ph : ph; // group is the match suffix
      });
    }
    const secrets = scanText(out, cfg.relaxBlobRules ? ENVELOPE_RELAXED_RULES : undefined);
    if (secrets.length) return rej(secrets.map((r) => `secret:${r}`), redactions);
    if (redactions.length && mode === "reject") return rej(["address_present_mode_reject"], redactions);
    return { ok: true, text: out, redactions, reasons: [] };
  } catch (e: any) { return rej([`internal_error:${e?.name ?? "Error"}`]); }
}

export class SanitizerRejected extends Error { constructor(public reasons: string[]) { super("sanitizer_rejected"); } }
const PUBKEY_RX = /\b(?:ed25519|secp256k1):[1-9A-HJ-NP-Za-km-z]{32,}\b/g;
/**
 * TS-only M4 rule key_material_in_context (applies to EVERY role incl. wrapped role:tool; never relaxed).
 * Secret-length only: ed25519 secret = 64 bytes (~86-88 base58); public ed25519 (32 bytes, ~43-44) is NOT matched.
 * secp256k1 secrets (32B) are indistinguishable by length from public data, so they are caught only when labelled.
 */
const KEY_MATERIAL_RULES: RegExp[] = [
  /ed25519:[1-9A-HJ-NP-Za-km-z]{80,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(?:private[_ ]?key|secret[_ ]?key|signing[_ ]?key|seed[_ ]?phrase|mnemonic|xprv)\b\\?["']?\s*[:=]\s*\\?["']?[^\s"'\\]{8,}/i,
  /\bsecp256k1:[1-9A-HJ-NP-Za-km-z]{40,46}\b(?=[^\n]{0,40}\b(?:secret|private)\b)|\b(?:secret|private)\b[^\n]{0,40}secp256k1:[1-9A-HJ-NP-Za-km-z]{40,46}\b/i,
  /\bxprv[1-9A-HJ-NP-Za-km-z]{100,}/,
];
export function keyMaterialInContext(t: string): boolean { return KEY_MATERIAL_RULES.some((rx) => rx.test(t)) || bip39Like(t); }
export function redact(s: string, cfg: SanitizerConfig = {}): string {
  if (keyMaterialInContext(s)) throw new SanitizerRejected(["secret:key_material_in_context"]);
  const r = sanitizeForRemote(s, cfg); if (!r.ok) throw new SanitizerRejected(r.reasons);
  return r.text.replace(PUBKEY_RX, "[REDACTED_KEY]");
}
export const noopSanitizer: Sanitizer = (m) => m.map((x) => ({ ...x }));
/**
 * Soft rule (PS M3 follow-up, option A): a role:"tool" message whose content is EXACTLY a well-formed
 * untrusted_tool_output envelope (as produced by wrapUntrusted: strict key set, string data_json that JSON.parses)
 * is public read-only chain data. For it ONLY, base64_blob / hex_key_64+ are skipped (view_state values, hashes).
 * All other secret rules (PEM, ed25519 secret, sk-, api_key=, bip39) and address redaction still apply.
 * Unwrapped tool content, and every user/assistant/system message, keep the full hardened ruleset.
 */
const ENV_KEYS = ["data_json", "notice", "ok", "tool", "truncated"].join(",");
export function isWrappedUntrustedToolMessage(x: ChatMessage): boolean {
  if (x.role !== "tool" || typeof x.content !== "string") return false;
  try {
    const o = JSON.parse(x.content);
    if (!o || typeof o !== "object" || Array.isArray(o) || Object.keys(o).join(",") !== "untrusted_tool_output") return false;
    const e = o.untrusted_tool_output;
    if (!e || typeof e !== "object" || Array.isArray(e) || Object.keys(e).sort().join(",") !== ENV_KEYS) return false;
    if (typeof e.tool !== "string" || typeof e.ok !== "boolean" || typeof e.truncated !== "boolean" || typeof e.notice !== "string" || typeof e.data_json !== "string") return false;
    JSON.parse(e.data_json);
    return true;
  } catch { return false; }
}
export const defaultSanitizer: Sanitizer = (m) => m.map((x) => ({ ...x,
  content: typeof x.content === "string" ? redact(x.content, isWrappedUntrustedToolMessage(x) ? { relaxBlobRules: true } : {}) : x.content }));
export function sanitizeMessages(m: readonly ChatMessage[], s: Sanitizer = defaultSanitizer): ChatMessage[] {
  const out = s(m);
  if (!Array.isArray(out) || out.length !== m.length) throw new Error("sanitizer_contract_violation");
  return out;
}
