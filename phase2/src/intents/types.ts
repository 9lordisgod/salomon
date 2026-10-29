/** M4 G2 types. Everything here is UNSIGNED draft data. No signature/key fields exist by construction. */
export type IntentKind = "transfer" | "token_diff" | "ft_withdraw";
export type Network = "testnet" | "mainnet";
export interface IntentItem { intent: IntentKind; receiver_id?: string; tokens?: Record<string, string>; diff?: Record<string, string> }
export interface IntentDraft {
  schema: "m4.intent_draft.v0"; signer_id: string; verifying_contract: string; deadline: string; nonce: string;
  intents: IntentItem[]; unsigned: true;
}
export interface ForeignTxDraft { schema: "m4.foreign_tx_draft.v0"; chain: string; derivation_path: string; to: string; value: string; data_hex?: string; unsigned: true }
export interface ChainSigRequestDraft { schema: "m4.chain_sig_request_draft.v0"; mpc_contract: string; chain: string; derivation_path: string; payload_sha256: string; key_version: number; unsigned: true }
export type AnyDraft = IntentDraft | ForeignTxDraft | ChainSigRequestDraft;
/** Host-side only. draft_json NEVER goes into Completions. */
export interface DraftArtefact { schema: AnyDraft["schema"]; draft_json: string; draft_sha256: string; human_summary: string; unsigned: true }
/** The ONLY shape the model ever sees for a draft (PS G1 HARD rule). */
export interface ModelDraftView { draft_sha256: string; human_summary: string; unsigned: true; schema: AnyDraft["schema"] }
export interface QuoteShape { status: "not_implemented"; quotes: [] }
export class DraftDenied extends Error { constructor(public readonly reason: string) { super(`draft denied: ${reason}`); this.name = "DraftDenied"; } }
export class NotImplemented extends Error { constructor(what: string) { super(`not_implemented: ${what} (M4 G2 has no sign/settle/broadcast path)`); this.name = "NotImplemented"; } }
