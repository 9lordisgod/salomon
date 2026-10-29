import { describe, it, expect } from "vitest";
import * as secp from "@noble/secp256k1";
import { createHash } from "node:crypto";
import { VerifiedCompletionClient, NobleResponseBinder, eip191Digest, ethAddress, extractChatId, bindCompletion, DigestLogger,
  type CompletionFetch, type VerifiedAttestation } from "../src/index.js";

const sk = secp.utils.randomSecretKey(), addr = "0x" + ethAddress(secp.getPublicKey(sk));
const sk2 = secp.utils.randomSecretKey(), addr2 = "0x" + ethAddress(secp.getPublicKey(sk2));
const va = (signingAddress: string): VerifiedAttestation => ({ modelId: "m", signingAddress, signingAlgo: "ecdsa", nonceHash: "h",
  quoteSha256: "q", composeSha256: "c", rtmr3: "r", mrConfigId: "x", tcbStatus: "UpToDate", nvidiaVerified: false,
  candidateIndex: 0, allowlistEntry: "test_only", verifiedAt: "t" });
const sha = (b: Uint8Array | string) => createHash("sha256").update(b).digest("hex");
const signHex = (text: string, k = sk) => { const r = secp.sign(eip191Digest(text), k, { format: "recovered", prehash: false }); return "0x" + Buffer.from([...r.slice(1), r[0]! + 27]).toString("hex"); };
const RAW = '{"id":"chatcmpl-1",  "choices":[{"message":{"content":"hi"}}]}'; // non-canonical whitespace on purpose

type Opts = { retained?: VerifiedAttestation[]; sig?: (req: Uint8Array) => Record<string, unknown> | null; sig404s?: number; raw?: string; textOverride?: string };
function setup(o: Opts = {}) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  let reqBytes: Uint8Array = new Uint8Array(); let n404 = o.sig404s ?? 0;
  const raw = o.raw ?? RAW;
  const fetch: CompletionFetch = async (url, init) => {
    calls.push({ url, headers: init.headers });
    if (url.endsWith("/v1/chat/completions")) { reqBytes = init.body!; return { status: 200, text: async () => raw }; }
    if (n404-- > 0) return { status: 404, text: async () => '{"error_code":"not_found"}' };
    const s = o.sig ? o.sig(reqBytes) : (() => {
      const text = o.textOverride ?? `m:${sha(reqBytes)}:${sha(raw)}`;
      return { text, signature: signHex(text), signing_address: addr, signing_algo: "ecdsa", signature_kind: "provider_tee" };
    })();
    return s ? { status: 200, text: async () => JSON.stringify(s) } : { status: 404, text: async () => "" };
  };
  const retained = o.retained ?? [va(addr), va(addr2)];
  const logger = new DigestLogger(() => {});
  const c = new VerifiedCompletionClient({ attestation: { assertReadyForRemoteInference: () => { if (!retained.length) throw new Error("not attested"); return retained; } },
    binder: new NobleResponseBinder(), fetch, sleep: async () => {}, logger });
  return { c, calls, logger };
}
const body = { messages: [{ role: "user", content: "hello" }] };

describe("VerifiedCompletionClient E2E skeleton (§C item 7)", () => {
  it("happy path: unique provider_tee sig → verified; correct URLs/headers", async () => {
    const { c, calls, logger } = setup();
    const r = await c.complete("m", body);
    expect(r.verified).toBe(true); expect(r.chatId).toBe("chatcmpl-1"); expect(r.attestation.signingAddress).toBe(addr);
    expect(calls[0]!.url).toBe("https://cloud-api.near.ai/v1/chat/completions");
    expect(calls[0]!.headers["x-no-aliasing"]).toBe("true"); expect(calls[0]!.headers["accept-encoding"]).toBe("identity");
    expect(calls[1]!.url).toBe("https://cloud-api.near.ai/v1/signature/chatcmpl-1?signing_algo=ecdsa");
    expect(JSON.stringify(logger.records)).not.toMatch(/hello|"hi"/);
  });
  it("hashes raw response bytes (re-stringified would differ)", async () => {
    const r = await setup().c.complete("m", body);
    expect(r.responseHash).toBe(sha(RAW)); expect(r.responseHash).not.toBe(sha(JSON.stringify(JSON.parse(RAW))));
  });
  it("signature over re-serialized response → deny", async () => {
    const { c } = setup({ sig: (req) => { const t = `m:${sha(req)}:${sha(JSON.stringify(JSON.parse(RAW)))}`;
      return { text: t, signature: signHex(t), signing_address: addr, signing_algo: "ecdsa", signature_kind: "provider_tee" }; } });
    await expect(c.complete("m", body)).rejects.toThrow("signed_text_mismatch");
  });
  it("404 retry: succeeds within bound, denies after exhausting", async () => {
    expect((await setup({ sig404s: 2 }).c.complete("m", body)).verified).toBe(true);
    const s = setup({ sig404s: 3 }); await expect(s.c.complete("m", body)).rejects.toThrow("signature_missing");
    expect(s.calls.length).toBe(4);
  });
  it("0 match (signer not retained) → deny", async () => {
    await expect(setup({ retained: [va(addr2)] }).c.complete("m", body)).rejects.toThrow("signer_match_none");
  });
  it("2 matches → deny", async () => {
    await expect(setup({ retained: [va(addr), va(addr)] }).c.complete("m", body)).rejects.toThrow("signer_match_ambiguous");
  });
  it("gateway-only kind → deny", async () => {
    const { c } = setup({ sig: (req) => { const t = `m:${sha(req)}:${sha(RAW)}`;
      return { text: t, signature: signHex(t), signing_address: addr, signing_algo: "ecdsa", signature_kind: "gateway" }; } });
    await expect(c.complete("m", body)).rejects.toThrow("gateway_signature_only");
  });
  it("wrong text → deny", async () => {
    await expect(setup({ textOverride: "m:00:00" }).c.complete("m", body)).rejects.toThrow("signed_text_mismatch");
  });
  it("assertReady not called / empty retain set → deny, no network", async () => {
    const s = setup({ retained: [] });
    await expect(s.c.complete("m", body)).rejects.toThrow("no_verified_attestation"); expect(s.calls.length).toBe(0);
  });
  it("missing x-no-aliasing → deny at bind", async () => {
    const req = new TextEncoder().encode("{}"), res = new TextEncoder().encode(RAW), text = `m:${sha(req)}:${sha(res)}`;
    const r = await bindCompletion([va(addr)], { modelId: "m", requestBody: req, responseBody: res, requestHeaders: {}, signingAlgo: "ecdsa",
      signature: { text, signature: signHex(text), signing_address: addr, signing_algo: "ecdsa", signature_kind: "provider_tee" } }, new NobleResponseBinder());
    expect(r).toMatchObject({ ok: false, reason: "missing_x_no_aliasing" });
  });
  it("model forced canonical in request body", async () => {
    const r = await setup({ sig: (req) => { expect(JSON.parse(new TextDecoder().decode(req)).model).toBe("m");
      const t = `m:${sha(req)}:${sha(RAW)}`; return { text: t, signature: signHex(t), signing_address: addr, signing_algo: "ecdsa", signature_kind: "provider_tee" }; } })
      .c.complete("m", { ...body, model: "alias" });
    expect(r.verified).toBe(true);
  });
  it("chat_id extraction: id, chat_id fallback, missing → deny", async () => {
    expect(extractChatId({ id: "a" })).toBe("a"); expect(extractChatId({ chat_id: "b" })).toBe("b");
    expect(() => extractChatId({})).toThrow("chat_id_missing");
    await expect(setup({ raw: '{"choices":[]}' }).c.complete("m", body)).rejects.toThrow("chat_id_missing");
  });
});
