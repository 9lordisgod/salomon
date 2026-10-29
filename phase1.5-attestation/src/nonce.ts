import { randomBytes } from "node:crypto";
/** 32-byte cryptographically random nonce, lowercase hex (64 chars). */
export function generateNonce(): string {
  return randomBytes(32).toString("hex");
}
