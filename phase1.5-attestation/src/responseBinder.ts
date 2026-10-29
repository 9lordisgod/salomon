import * as secp from "@noble/secp256k1";
import * as ed from "@noble/ed25519";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { sha512 } from "@noble/hashes/sha2.js";
import { hmac } from "@noble/hashes/hmac.js";
import type { ResponseSignatureBinder, SigningAlgo } from "./responseBinding.js";

secp.hashes.sha256 ??= sha256;
secp.hashes.hmacSha256 ??= (k: Uint8Array, m: Uint8Array) => hmac(sha256, k, m);
ed.hashes.sha512 ??= sha512;

const enc = new TextEncoder();
const unhex = (s: string): Uint8Array | null => {
  const h = s.toLowerCase().replace(/^0x/, "");
  return h.length % 2 === 0 && /^[0-9a-f]*$/.test(h) ? Uint8Array.from(Buffer.from(h, "hex")) : null;
};
const toHex = (b: Uint8Array) => Buffer.from(b).toString("hex");

/** EIP-191 personal_sign digest: keccak256("\x19Ethereum Signed Message:\n" + len(bytes) + bytes). */
export function eip191Digest(text: string): Uint8Array {
  const m = enc.encode(text);
  return keccak_256(new Uint8Array([...enc.encode(`\x19Ethereum Signed Message:\n${m.length}`), ...m]));
}
/** Ethereum address (lowercase hex, no 0x) of an uncompressed/compressed secp256k1 pubkey. */
export function ethAddress(pub: Uint8Array): string {
  const u = secp.Point.fromBytes(pub).toBytes(false);
  return toHex(keccak_256(u.slice(1)).slice(-20));
}

/**
 * Real provider_tee crypto binder (PRE_PHASE2_ACCEPTANCE.md §C).
 * ecdsa: 65-byte r‖s‖v (v∈{0,1,27,28}), EIP-191 recover, low-s enforced, recovered address === signing_address.
 * ed25519: 64-byte signature verified with signing_address as 32-byte pubkey over the UTF-8 text.
 * Any parse/crypto error ⇒ deny.
 */
export class NobleResponseBinder implements ResponseSignatureBinder {
  readonly name = "noble-response-binder";
  async verify(text: string, signature: string, signingAddress: string, algo: SigningAlgo): Promise<{ ok: boolean; reason?: string }> {
    const sig = unhex(signature ?? ""), addr = unhex(signingAddress ?? "");
    if (!sig || !addr) return { ok: false, reason: "binder_hex_invalid" };
    try {
      if (algo === "ecdsa") {
        if (sig.length !== 65 || addr.length !== 20) return { ok: false, reason: "binder_ecdsa_length" };
        let v = sig[64]!; if (v >= 27) v -= 27;
        if (v !== 0 && v !== 1) return { ok: false, reason: "binder_ecdsa_v" };
        const rec = new Uint8Array(65); rec[0] = v; rec.set(sig.slice(0, 64), 1);
        const S = secp.Signature.fromBytes(sig.slice(0, 64), "compact");
        if (S.hasHighS()) return { ok: false, reason: "binder_ecdsa_high_s" };
        const pub = secp.recoverPublicKey(rec, eip191Digest(text), { prehash: false });
        return ethAddress(pub) === toHex(addr) ? { ok: true } : { ok: false, reason: "binder_signer_mismatch" };
      }
      if (algo === "ed25519") {
        if (sig.length !== 64 || addr.length !== 32) return { ok: false, reason: "binder_ed25519_length" };
        return ed.verify(sig, enc.encode(text), addr) ? { ok: true } : { ok: false, reason: "binder_signature_invalid" };
      }
      return { ok: false, reason: "binder_algo_unsupported" };
    } catch { return { ok: false, reason: "binder_crypto_error" }; }
  }
}
