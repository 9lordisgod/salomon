/**
 * M4 G2 propose-only tools. Produce UNSIGNED drafts; never sign/settle/broadcast/simulate.
 * Model sees ONLY { draft_sha256, human_summary, unsigned:true, schema } wrapped UNTRUSTED (PS G1 HARD).
 * Full DraftArtefact (draft_json) stays host-side: getArtefact(sha) for the OUTER caller only.
 */
import { randomBytes } from "node:crypto";
import { wrapUntrusted } from "./nearReadOnly.js";
import { DraftDenied, type AnyDraft, type DraftArtefact, type ModelDraftView, type ForeignTxDraft, type ChainSigRequestDraft } from "../intents/types.js";
import { loadIntentsConfig, type IntentsConfig } from "../intents/config.js";
import { buildIntentDraft, rejectForbiddenFields, CHAIN_RE, PATH_RE } from "../intents/validate.js";
import { canonicalJson, draftSha256 } from "../intents/hash.js";
import { humanSummary } from "../intents/summary.js";

/**
 * Narrowed deny pattern (DESIGN §7): a tool name is forbidden if ANY underscore-delimited segment is a forbidden verb.
 * Does NOT match propose_intent / propose_chain_sig_request / prepare_foreign_tx / preview_derived_address (no segment equals a verb).
 */
export const FORBIDDEN_TOOL_RE = /(^|_)(sign|submit|broadcast|settle|execute|simulate|send|publish|deposit|withdraw_now)(_|$)/i;
export const FORBIDDEN_TOOL_NAMES: ReadonlySet<string> = new Set(["sign", "submit", "broadcast", "settle", "execute_intents", "simulate_intents", "send_tx", "mpc_sign", "broadcast_tx_commit", "broadcast_tx_async", "sign_message", "sign_intent"]);
export const isForbiddenToolName = (n: string) => FORBIDDEN_TOOL_NAMES.has(n.toLowerCase()) || FORBIDDEN_TOOL_RE.test(n);
export function assertNoForbiddenTools(specs: readonly { function: { name: string } }[]): void {
  for (const s of specs) if (isForbiddenToolName(s.function.name)) throw new Error(`forbidden_tool_registered:${s.function.name}`);
}

const obj = (properties: Record<string, unknown>, required: string[]) => ({ type: "object", properties, required, additionalProperties: false });
export const PROPOSE_TOOL_SPECS = [
  { type: "function", function: { name: "propose_intent", description: "Propose an UNSIGNED NEAR Intents draft. Returns only a hash + summary; the user signs elsewhere. Verifier/deadline/nonce are set by the host.",
    parameters: obj({ signer_id: { type: "string" }, ttl_seconds: { type: "integer" }, intents: { type: "array", maxItems: 4, items: { type: "object" } } }, ["signer_id", "intents"]) } },
  { type: "function", function: { name: "preview_derived_address", description: "Record a chain-signatures derivation path for a chain (preview only; address derivation not implemented in G2).",
    parameters: obj({ chain: { type: "string" }, path: { type: "string" } }, ["chain", "path"]) } },
  { type: "function", function: { name: "prepare_foreign_tx", description: "Prepare an UNSIGNED foreign-chain tx draft (hash + summary only). Never signed or broadcast.",
    parameters: obj({ chain: { type: "string" }, path: { type: "string" }, to: { type: "string" }, value: { type: "string" }, data_hex: { type: "string" } }, ["chain", "path", "to", "value"]) } },
  { type: "function", function: { name: "propose_chain_sig_request", description: "Propose an UNSIGNED chain-signature REQUEST draft for a payload hash. Not submitted to MPC.",
    parameters: obj({ chain: { type: "string" }, path: { type: "string" }, payload_sha256: { type: "string" }, key_version: { type: "integer" } }, ["chain", "path", "payload_sha256"]) } },
  { type: "function", function: { name: "quote_intent", description: "Quote shape stub (G2): always returns not_implemented, empty quotes.",
    parameters: obj({ token_in: { type: "string" }, token_out: { type: "string" }, amount: { type: "string" } }, ["token_in", "token_out", "amount"]) } },
] as const;
export const PROPOSE_TOOL_NAMES: ReadonlySet<string> = new Set(PROPOSE_TOOL_SPECS.map((t) => t.function.name));
assertNoForbiddenTools(PROPOSE_TOOL_SPECS);

export interface ProposeToolsOptions { env?: Record<string, string | undefined>; now?: () => Date; nonce?: () => string; config?: IntentsConfig }
export class ProposeTools {
  private readonly artefacts = new Map<string, DraftArtefact>();
  private readonly pathChain = new Map<string, string>();
  constructor(private readonly o: ProposeToolsOptions = {}) { assertNoForbiddenTools(PROPOSE_TOOL_SPECS); }
  /** HOST-SIDE ONLY: full artefact for the outer caller (wallet UI). Never pass into Completions. */
  getArtefact(sha: string): DraftArtefact | undefined { const a = this.artefacts.get(sha); return a ? { ...a } : undefined; }
  listArtefacts(): DraftArtefact[] { return [...this.artefacts.values()].map((a) => ({ ...a })); }
  private cfg(): IntentsConfig { return this.o.config ?? loadIntentsConfig(this.o.env ?? process.env); }
  private bindPath(chain: string, path: string) {
    if (!CHAIN_RE.test(chain)) throw new DraftDenied("bad_chain"); if (!PATH_RE.test(path)) throw new DraftDenied("bad_path");
    const prev = this.pathChain.get(path); if (prev !== undefined && prev !== chain) throw new DraftDenied("path_reuse_across_chains");
    this.pathChain.set(path, chain);
  }
  private store(d: AnyDraft): ModelDraftView {
    const draft_json = canonicalJson(d); const draft_sha256 = draftSha256(draft_json); const human_summary = humanSummary(d);
    this.artefacts.set(draft_sha256, { schema: d.schema, draft_json, draft_sha256, human_summary, unsigned: true });
    return { draft_sha256, human_summary, unsigned: true, schema: d.schema };
  }
  async execute(name: string, rawArgs: string): Promise<string> {
    const n = name.slice(0, 64);
    if (isForbiddenToolName(name)) return wrapUntrusted(n, false, { error: "forbidden_tool" });
    if (!PROPOSE_TOOL_NAMES.has(name)) return wrapUntrusted(n, false, { error: "tool_not_permitted" });
    let a: any; try { a = JSON.parse(rawArgs || "{}"); if (!a || typeof a !== "object" || Array.isArray(a)) throw 0; } catch { return wrapUntrusted(n, false, { error: "bad_args" }); }
    try {
      rejectForbiddenFields(a);
      if (name === "quote_intent") return wrapUntrusted(n, true, { status: "not_implemented", quotes: [] });
      if (name === "propose_intent") {
        const cfg = this.cfg();
        const d = buildIntentDraft(a, cfg, (this.o.now ?? (() => new Date()))(), (this.o.nonce ?? (() => randomBytes(32).toString("base64")))());
        return wrapUntrusted(n, true, this.store(d));
      }
      const chain = String(a.chain ?? ""), path = String(a.path ?? "");
      if (name === "preview_derived_address") { this.bindPath(chain, path);
        return wrapUntrusted(n, true, { chain, path, derived_address: null, status: "not_implemented_g2" }); }
      if (name === "prepare_foreign_tx") {
        this.cfg(); this.bindPath(chain, path);
        if (typeof a.to !== "string" || !/^[A-Za-z0-9._:-]{2,128}$/.test(a.to)) throw new DraftDenied("bad_to");
        if (typeof a.value !== "string" || !/^\d{1,39}$/.test(a.value)) throw new DraftDenied("bad_amount");
        if (a.data_hex !== undefined && (typeof a.data_hex !== "string" || !/^(0x)?[0-9a-fA-F]{0,2048}$/.test(a.data_hex))) throw new DraftDenied("bad_data_hex");
        const d: ForeignTxDraft = { schema: "m4.foreign_tx_draft.v0", chain, derivation_path: path, to: a.to, value: a.value, ...(a.data_hex ? { data_hex: a.data_hex } : {}), unsigned: true };
        return wrapUntrusted(n, true, this.store(d));
      }
      // propose_chain_sig_request
      const cfg = this.cfg(); if (!cfg.mpcContractId) throw new DraftDenied("env_unconfigured");
      this.bindPath(chain, path);
      if (typeof a.payload_sha256 !== "string" || !/^[0-9a-f]{64}$/.test(a.payload_sha256)) throw new DraftDenied("bad_payload_hash");
      const kv = a.key_version ?? 0; if (!Number.isSafeInteger(kv) || kv < 0 || kv > 16) throw new DraftDenied("bad_key_version");
      const d: ChainSigRequestDraft = { schema: "m4.chain_sig_request_draft.v0", mpc_contract: cfg.mpcContractId, chain, derivation_path: path, payload_sha256: a.payload_sha256, key_version: kv, unsigned: true };
      return wrapUntrusted(n, true, this.store(d));
    } catch (e) { return wrapUntrusted(n, false, { error: e instanceof DraftDenied ? e.reason : "tool_failed" }); }
  }
}

/** Routes read-only vs propose; unknown ⇒ wrapped error. */
export class CompositeTools {
  constructor(private readonly readOnly: { execute(n: string, a: string): Promise<string> }, readonly propose: ProposeTools) {}
  execute(name: string, args: string): Promise<string> {
    if (isForbiddenToolName(name)) return Promise.resolve(wrapUntrusted(name.slice(0, 64), false, { error: "forbidden_tool" }));
    return PROPOSE_TOOL_NAMES.has(name) ? this.propose.execute(name, args) : this.readOnly.execute(name, args);
  }
}
