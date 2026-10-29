/** Re-export of the phase2 local pin (single source; phase2 never imports phase3-runtime). */
export { LOCAL_MODELS, DEFAULT_LOCAL_MODEL, assertAllowedLocalModel, type LocalModelId } from "../../phase2/src/localModel.js";

/** Pinned product GGUF (Model Engineer M1). ask_local.py resolves + verifies; TS never downloads. */
export const EXPECTED_GGUF_NAME = "salomon-qwen25-7b-instruct-Q4_K_M.gguf";
export const EXPECTED_GGUF_SHA256 = "65b8fcd92af6b4fefa935c625d1ac27ea29dcb6ee14589c55a8f115ceaaa1423";
