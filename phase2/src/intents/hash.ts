import { createHash } from "node:crypto";
/** Canonical JSON: sorted object keys, no whitespace. */
export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonicalJson).join(",") + "]";
  return "{" + Object.keys(v as object).filter((k) => (v as any)[k] !== undefined).sort().map((k) => JSON.stringify(k) + ":" + canonicalJson((v as any)[k])).join(",") + "}";
}
export const sha256Hex = (s: string) => createHash("sha256").update(s).digest("hex");
export const draftSha256 = (draftJson: string) => sha256Hex(draftJson);
export function verifyArtefactHash(a: { draft_json: string; draft_sha256: string }): boolean { return sha256Hex(a.draft_json) === a.draft_sha256; }
