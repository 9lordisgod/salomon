/** Fail-closed validators. Any deviation ⇒ DraftDenied(reason). */
import { DraftDenied, type IntentDraft, type IntentItem, type IntentKind } from "./types.js";
import type { IntentsConfig } from "./config.js";
export const ACCOUNT_RE = /^(?=.{2,64}$)(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;
export const MAX_INTENTS = 4, MAX_TTL_SECONDS = 600;
const KINDS: ReadonlySet<IntentKind> = new Set(["transfer", "token_diff", "ft_withdraw"]);
const FORBIDDEN_FIELD_RE = /^(signature|signatures|public_key|private_key|secret_key|seed|seed_phrase|mnemonic|signed|standard)$/i;
const U128 = /^\d{1,39}$/; const I128 = /^-?\d{1,39}$/;
export function rejectForbiddenFields(v: unknown, depth = 0): void {
  if (depth > 6) throw new DraftDenied("draft_too_deep");
  if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { if (FORBIDDEN_FIELD_RE.test(k)) throw new DraftDenied("forbidden_field"); rejectForbiddenFields(x, depth + 1); }
}
const onlyKeys = (o: object, keys: string[]) => { for (const k of Object.keys(o)) if (!keys.includes(k)) throw new DraftDenied("extra_field"); };
/** Amount (raw token units) → yocto-NEAR-equivalent scale (normalised to 24 decimals) for cap compare. */
function toCapScale(raw: bigint, decimals: number): bigint { return decimals <= 24 ? raw * 10n ** BigInt(24 - decimals) : raw / 10n ** BigInt(decimals - 24); }
function checkAmounts(r: unknown, cfg: IntentsConfig, signed: boolean): bigint {
  if (!r || typeof r !== "object" || Array.isArray(r) || Object.keys(r).length === 0 || Object.keys(r).length > 8) throw new DraftDenied("bad_amounts");
  let total = 0n;
  for (const [tok, amt] of Object.entries(r as Record<string, unknown>)) {
    const rule = cfg.tokens.get(tok); if (!rule) throw new DraftDenied("token_not_allowlisted");
    if (typeof amt !== "string" || !(signed ? I128 : U128).test(amt)) throw new DraftDenied("bad_amount");
    const v = BigInt(amt); const abs = v < 0n ? -v : v; if (abs === 0n || abs >= 2n ** 128n) throw new DraftDenied("bad_amount");
    const scaled = toCapScale(abs, rule.decimals);
    if (scaled > cfg.maxDraftAmountYocto) throw new DraftDenied("draft_amount_cap_exceeded"); // per-intent/per-token
    total += scaled;
  }
  return total;
}
export interface ProposeIntentArgs { signer_id: string; intents: IntentItem[]; ttl_seconds?: number }
/** Validates model args and builds a draft with HOST-owned verifying_contract/deadline/nonce. */
export function buildIntentDraft(a: any, cfg: IntentsConfig, now: Date, nonceB64: string): IntentDraft {
  if (!a || typeof a !== "object" || Array.isArray(a)) throw new DraftDenied("bad_args");
  rejectForbiddenFields(a);
  if ("verifying_contract" in a) throw new DraftDenied("verifying_contract_env_only");
  if ("deadline" in a || "nonce" in a) throw new DraftDenied("host_owned_field");
  onlyKeys(a, ["signer_id", "intents", "ttl_seconds"]);
  if (typeof a.signer_id !== "string" || !ACCOUNT_RE.test(a.signer_id)) throw new DraftDenied("bad_signer_id");
  if (!Array.isArray(a.intents) || a.intents.length === 0) throw new DraftDenied("no_intents");
  if (a.intents.length > MAX_INTENTS) throw new DraftDenied("too_many_intents");
  const ttl = a.ttl_seconds === undefined ? MAX_TTL_SECONDS : a.ttl_seconds;
  if (!Number.isSafeInteger(ttl) || ttl < 30 || ttl > MAX_TTL_SECONDS) throw new DraftDenied("bad_deadline");
  let draftTotal = 0n;
  const intents: IntentItem[] = a.intents.map((i: any) => {
    if (!i || typeof i !== "object" || !KINDS.has(i.intent)) throw new DraftDenied("unknown_intent_kind");
    if (i.intent === "token_diff") { onlyKeys(i, ["intent", "diff"]); draftTotal += checkAmounts(i.diff, cfg, true); return { intent: i.intent, diff: { ...i.diff } }; }
    onlyKeys(i, ["intent", "receiver_id", "tokens"]);
    if (typeof i.receiver_id !== "string" || !ACCOUNT_RE.test(i.receiver_id)) throw new DraftDenied("bad_receiver_id");
    draftTotal += checkAmounts(i.tokens, cfg, false);
    return { intent: i.intent, receiver_id: i.receiver_id, tokens: { ...i.tokens } };
  });
  if (draftTotal > cfg.maxDraftAmountYocto) throw new DraftDenied("draft_amount_cap_exceeded"); // per-draft
  return { schema: "m4.intent_draft.v0", signer_id: a.signer_id, verifying_contract: cfg.verifierId,
    deadline: new Date(now.getTime() + ttl * 1000).toISOString(), nonce: nonceB64, intents, unsigned: true };
}
export const CHAIN_RE = /^(ethereum|base|arbitrum|bitcoin|solana|near)$/;
export const PATH_RE = /^[A-Za-z0-9_\-./,]{1,64}$/;
