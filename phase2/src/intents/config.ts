/** Env-only contract IDs / caps. AE never invents IDs; Lead fills .env.example. Missing required ⇒ DraftDenied. */
import { DraftDenied, type Network } from "./types.js";
export const YOCTO_PER_NEAR = 10n ** 24n;
/** Lead+PS locked ceilings (whole NEAR). MAX_DRAFT_AMOUNT must be set AND ≤ network ceiling. */
export const NETWORK_CAP_CEILING_NEAR: Record<Network, bigint> = { testnet: 1000n, mainnet: 10n };
export interface TokenRule { token_id: string; decimals: number }
export interface IntentsConfig { network: Network; verifierId: string; mpcContractId?: string; tokens: Map<string, TokenRule>; maxDraftAmountYocto: bigint }
const ACCOUNT_RE = /^(?=.{2,64}$)(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;
/** Parse decimal NEAR string ("10", "0.5") to yocto bigint. */
export function nearToYocto(s: string): bigint {
  const m = /^(\d{1,12})(?:\.(\d{1,24}))?$/.exec(s.trim()); if (!m) throw new DraftDenied("draft_amount_cap_invalid");
  return BigInt(m[1]) * YOCTO_PER_NEAR + BigInt((m[2] ?? "").padEnd(24, "0") || "0");
}
export function loadIntentsConfig(env: Record<string, string | undefined> = process.env): IntentsConfig {
  const network = env.NETWORK; if (network !== "testnet" && network !== "mainnet") throw new DraftDenied("env_unconfigured");
  const verifierId = env.INTENTS_VERIFIER_ID ?? ""; if (!ACCOUNT_RE.test(verifierId)) throw new DraftDenied("env_unconfigured");
  // Soft polish (PS residual): mainnet-shaped verifier (e.g. intents.near) on testnet ⇒ fail closed.
  if (network === "testnet" && (verifierId === "intents.near" || (verifierId.endsWith(".near") && !verifierId.endsWith(".testnet")))) throw new DraftDenied("verifier_mainnet_on_testnet");
  const mpc = env.MPC_CONTRACT_ID || undefined; if (mpc !== undefined && !ACCOUNT_RE.test(mpc)) throw new DraftDenied("env_unconfigured");
  const tokens = new Map<string, TokenRule>();
  for (const raw of (env.TOKEN_ALLOWLIST ?? "").split(",").map((x) => x.trim()).filter(Boolean)) {
    const m = /^([A-Za-z0-9._:-]{2,128})@(\d{1,2})$/.exec(raw); if (!m) throw new DraftDenied("env_unconfigured");
    tokens.set(m[1], { token_id: m[1], decimals: Number(m[2]) });
  }
  if (tokens.size === 0) throw new DraftDenied("env_unconfigured");
  const cap = env.MAX_DRAFT_AMOUNT; if (!cap || !cap.trim()) throw new DraftDenied("draft_amount_cap_missing");
  const maxDraftAmountYocto = nearToYocto(cap);
  if (maxDraftAmountYocto <= 0n || maxDraftAmountYocto > NETWORK_CAP_CEILING_NEAR[network] * YOCTO_PER_NEAR) throw new DraftDenied("draft_amount_cap_exceeds_network_ceiling");
  return { network, verifierId, mpcContractId: mpc, tokens, maxDraftAmountYocto };
}
