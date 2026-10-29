import { describe, it, expect } from "vitest";
import { assertBoundCompletion, bindCompletion, expectedSignedText, StubFailClosedResponseBinder, expectedReportData,
  type ResponseSignatureBinder, type VerifiedAttestation, type CompletionEvidence } from "../src/index.js";

const A = "0x" + "aa".repeat(20), B = "0x" + "bb".repeat(20);
const va = (signingAddress: string, modelId = "m", signingAlgo: "ecdsa" | "ed25519" = "ecdsa"): VerifiedAttestation => ({
  modelId, signingAddress, signingAlgo, nonceHash: "h", quoteSha256: "q", composeSha256: "c", rtmr3: "r", mrConfigId: "x",
  tcbStatus: "UpToDate", nvidiaVerified: false, candidateIndex: 0, allowlistEntry: "test_only", verifiedAt: "t",
});
const req = new TextEncoder().encode('{"model":"m","messages":[]}');
const res = new TextEncoder().encode('{"id":"c1","choices":[]}');
const ev = (o: Partial<CompletionEvidence> = {}, sig: Record<string, unknown> = {}): CompletionEvidence => ({
  modelId: "m", requestBody: req, responseBody: res, requestHeaders: { "x-no-aliasing": "true" }, signingAlgo: "ecdsa",
  signature: { text: expectedSignedText("m", req, res), signature: "0xsig", signing_address: A, signing_algo: "ecdsa", signature_kind: "provider_tee", ...sig }, ...o,
});
/** test_only binder: accepts iff address in `ok` set. */
const tb = (...ok: string[]): ResponseSignatureBinder => ({ name: "test_only", verify: async (_t, _s, addr) => ({ ok: ok.includes(addr) }) });
const reason = async (p: Promise<{ ok: boolean; reason?: string }>) => ((await p) as { reason?: string }).reason;

describe("provider_tee binding (PRE_PHASE2_ACCEPTANCE §C)", () => {
  it("stub binder denies", async () => {
    expect(await new StubFailClosedResponseBinder().verify()).toEqual({ ok: false, reason: "response_binder_not_configured" });
    await expect(assertBoundCompletion([va(A)], ev())).rejects.toThrow("response_binder_not_configured");
  });
  it("happy path: unique match → verified (test_only binder)", async () => {
    const r = await bindCompletion([va(A), va(B)], ev(), tb(A));
    expect(r.ok).toBe(true);
  });
  it("no retain set → deny", async () => { expect(await reason(bindCompletion([], ev(), tb(A)))).toBe("no_verified_attestation"); });
  it("0 match → deny", async () => { expect(await reason(bindCompletion([va(A)], ev(), tb()))).toBe("signer_match_none"); });
  it("2 matches → deny", async () => {
    expect(await reason(bindCompletion([va(A), va(A)], ev(), tb(A)))).toBe("signer_match_ambiguous");
  });
  it("gateway kind only → deny; unknown/absent kind → deny", async () => {
    expect(await reason(bindCompletion([va(A)], ev({}, { signature_kind: "gateway" }), tb(A)))).toBe("gateway_signature_only");
    expect(await reason(bindCompletion([va(A)], ev({}, { signature_kind: undefined }), tb(A)))).toBe("signature_kind_unrecognized");
  });
  it("wrong text / wrong algo / address mismatch → deny", async () => {
    expect(await reason(bindCompletion([va(A)], ev({}, { text: "m:00:00" }), tb(A)))).toBe("signed_text_mismatch");
    expect(await reason(bindCompletion([va(A)], ev({}, { signing_algo: "ed25519" }), tb(A)))).toBe("signing_algo_mismatch");
    expect(await reason(bindCompletion([va(A, "m", "ed25519")], ev(), tb(A)))).toBe("signer_match_none");
    expect(await reason(bindCompletion([va(A)], ev({}, { signing_address: B }), tb(A, B)))).toBe("signer_match_none");
  });
  it("missing signature / error_code → deny", async () => {
    expect(await reason(bindCompletion([va(A)], ev({ signature: null }), tb(A)))).toBe("signature_missing");
    expect(await reason(bindCompletion([va(A)], ev({}, { error_code: "not_found" }), tb(A)))).toBe("signature_missing");
  });
  it("exact-byte sensitivity: re-serialized body → deny", async () => {
    const e = ev({ responseBody: new TextEncoder().encode('{"id": "c1", "choices": []}') });
    expect(await reason(bindCompletion([va(A)], e, tb(A)))).toBe("signed_text_mismatch");
  });
  it("wrong model / missing x-no-aliasing → deny", async () => {
    expect(await reason(bindCompletion([va(A, "other")], ev(), tb(A)))).toBe("model_id_mismatch");
    expect(await reason(bindCompletion([va(A)], ev({ requestHeaders: {} }), tb(A)))).toBe("missing_x_no_aliasing");
  });
  it("deny digest carries no body content", async () => {
    const r = await bindCompletion([va(A)], ev(), tb());
    expect(JSON.stringify(r)).not.toContain("choices");
  });
});

describe("report_data layout (§D)", () => {
  const n = "11".repeat(32);
  it("ecdsa 20B padded ‖ nonce", () => { expect(expectedReportData(A, n, "ecdsa")).toBe("aa".repeat(20) + "00".repeat(12) + n); });
  it("ed25519 exactly 32B", () => {
    expect(expectedReportData("cc".repeat(32), n, "ed25519")).toBe("cc".repeat(32) + n);
    expect(() => expectedReportData(A, n, "ed25519")).toThrow();
    expect(() => expectedReportData("cc".repeat(32), n, "ecdsa")).toThrow();
  });
  it("bad nonce length rejected", () => { expect(() => expectedReportData(A, "11", "ecdsa")).toThrow(); });
});
