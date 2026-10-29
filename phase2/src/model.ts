/** The ONLY model the Phase 2 loop may call (PS pin in phase1.5-attestation/allowlist/measurements.json). */
export const AGENT_MODEL = "z-ai/glm-5.3-flash" as const;
export function assertAllowedModel(m: string): asserts m is typeof AGENT_MODEL {
  if (m !== AGENT_MODEL) throw new Error("model_not_permitted");
}
