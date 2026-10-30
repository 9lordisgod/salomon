/** Re-export of the phase2 local pin (single source; phase2 never imports phase3-runtime). */
export { LOCAL_MODELS, DEFAULT_LOCAL_MODEL, assertAllowedLocalModel, type LocalModelId } from "../../phase2/src/localModel.js";
import { DEFAULT_LOCAL_MODEL, type LocalModelId } from "../../phase2/src/localModel.js";

/** Pinned mobile GGUF (LOCK.json bartowski_mobile_3b). */
export const MOBILE_GGUF_NAME = "salomon-qwen25-3b-instruct-Q4_K_M.gguf";

/** Honest model label for responses: derive from the GGUF ask_local.py will load (SALOMON_GGUF wins, then SALOMON_GGUF_ROLE). */
export function localModelForEnv(env: NodeJS.ProcessEnv = process.env): LocalModelId {
  const name = (env.SALOMON_GGUF ?? "").split("/").pop() ?? "";
  if (name === MOBILE_GGUF_NAME) return "qwen2.5-3b-instruct-q4_k_m";
  if (name) return DEFAULT_LOCAL_MODEL;
  return env.SALOMON_GGUF_ROLE === "mobile" ? "qwen2.5-3b-instruct-q4_k_m" : DEFAULT_LOCAL_MODEL;
}

/** Pinned product GGUF (Model Engineer M1). ask_local.py resolves + verifies; TS never downloads. */
export const EXPECTED_GGUF_NAME = "salomon-qwen25-7b-instruct-Q4_K_M.gguf";
export const EXPECTED_GGUF_SHA256 = "65b8fcd92af6b4fefa935c625d1ac27ea29dcb6ee14589c55a8f115ceaaa1423";
