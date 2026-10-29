/** Phase 3 M1 local-model pin (offline only). Separate from GLM remote pin in model.ts. */
export const LOCAL_MODELS = ["qwen2.5-7b-instruct-q4_k_m", "Qwen/Qwen2.5-0.5B-Instruct"] as const;
export type LocalModelId = (typeof LOCAL_MODELS)[number];
export const DEFAULT_LOCAL_MODEL: LocalModelId = "qwen2.5-7b-instruct-q4_k_m";
export function assertAllowedLocalModel(m: string): asserts m is LocalModelId {
  if (/abliterat|uncensor/i.test(m) || !(LOCAL_MODELS as readonly string[]).includes(m)) throw new Error("local_model_not_permitted");
}
