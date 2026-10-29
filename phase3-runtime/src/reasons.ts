/** Fixed plain-language reason map. Route/CLI `message` MUST come only from here. */
export const REASONS = {
  bad_request: { status: 400, message: "That request wasn't in a format Salomon accepts, so nothing was sent to the model." },
  input_refused: { status: 422, message: "Your message looked like it contained a secret (like a key, password, or recovery phrase), so it was stopped before the model saw it." },
  local_model_unavailable: { status: 503, message: "The local model isn't installed on this device, so nothing was sent anywhere." },
  local_model_not_permitted: { status: 503, message: "The configured local model isn't on the approved list, so Salomon refused to run it." },
  policy_mismatch: { status: 503, message: "Salomon is set to local-only and refused a non-local model setup." },
  prompt_missing: { status: 503, message: "Salomon's safety instructions file is missing, so it refused to run the model." },
  completion_failed: { status: 503, message: "The local model didn't finish or gave an unreadable reply, so no answer is shown." },
  timeout: { status: 503, message: "The local model took too long, so Salomon stopped it." },
  forbidden_tool: { status: 422, message: "The model tried to take an action (like saving or exporting). That isn't allowed here, so it was blocked." },
  tool_error: { status: 422, message: "A helper step failed, so Salomon stopped instead of guessing." },
  max_steps_exceeded: { status: 422, message: "The model needed too many steps, so Salomon stopped it." },
  internal_error: { status: 500, message: "Something went wrong inside Salomon, so it stopped without answering." },
} as const;
export type ReasonCode = keyof typeof REASONS;
export function toReason(code: string): ReasonCode {
  if (code in REASONS) return code as ReasonCode;
  if (code === "sanitizer_rejected" || code === "sanitizer_error") return "input_refused";
  if (code === "completion_unverified" || code === "malformed_response") return "completion_failed";
  if (code === "not_implemented") return "tool_error";
  return "internal_error";
}
