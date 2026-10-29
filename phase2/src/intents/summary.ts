/** Deterministic, host-generated human summary (model text never used). */
import type { AnyDraft } from "./types.js";
const kv = (r?: Record<string, string>) => Object.keys(r ?? {}).sort().map((k) => `${r![k]} ${k}`).join(", ");
export function humanSummary(d: AnyDraft): string {
  if (d.schema === "m4.intent_draft.v0") {
    const parts = d.intents.map((i, n) => i.intent === "token_diff" ? `#${n + 1} token_diff [${kv(i.diff)}]` : `#${n + 1} ${i.intent} [${kv(i.tokens)}] -> ${i.receiver_id}`);
    return `UNSIGNED intent draft for signer ${d.signer_id} on verifier ${d.verifying_contract}, deadline ${d.deadline}: ${parts.join("; ")}. Must be signed by the user's wallet outside the agent.`;
  }
  if (d.schema === "m4.foreign_tx_draft.v0") return `UNSIGNED ${d.chain} tx draft from path ${d.derivation_path} to ${d.to} value ${d.value}${d.data_hex ? " with calldata" : ""}. Not signed or broadcast.`;
  return `UNSIGNED chain-signature REQUEST draft (${d.chain}, path ${d.derivation_path}, key_version ${d.key_version}) for payload sha256 ${d.payload_sha256} on ${d.mpc_contract}. Not submitted to MPC.`;
}
