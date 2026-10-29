import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as secp from "@noble/secp256k1";
import * as ed from "@noble/ed25519";
import { generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import { NRAS_LEAF_ORG, checkLeafOrg, NRAS_JWKS_URL, NRAS_ISSUER, NRAS_X5C_PINNED_SPKI_SHA256, cachedJwksFetch, verifyJwkX5c, type Jwk, type JwksFetch } from "../src/index.js";
import { createPublicKey } from "node:crypto";
import { makeTestChain } from "./x5cTestChain.js";
import { DcapQuoteVerifier, DcapGatewayVerifier, NrasGpuVerifier, AttestationClient, NobleResponseBinder, eip191Digest, ethAddress,
  assertPlugsProductionReady, StubFailClosedVerifier, StubFailClosedResponseBinder, bindCompletion, expectedSignedText, expectedReportData,
  type GetCollateralAndVerify, type NrasFetch, type VerifiedAttestation } from "../src/index.js";

const b = (n: number, f: number) => new Uint8Array(n).fill(f);
const NONCE = "ab".repeat(32), ADDR = "0x" + "11".repeat(20);
const td = (o: Partial<Record<string, Uint8Array>> = {}) => ({ tdAttributes: b(8, 0), reportData: Buffer.from(expectedReportData(ADDR, NONCE, "ecdsa"), "hex"),
  rtMr0: b(48, 1), rtMr1: b(48, 2), rtMr2: b(48, 3), rtMr3: b(48, 4), mrConfigId: b(48, 5), mrTd: b(48, 6), ...o });
const qvl = (data: any, status = "UpToDate", type = "td10"): GetCollateralAndVerify => async () => ({ status, advisory_ids: [], report: { type, data } });
const QUOTE = "0x" + "04".repeat(64);

describe("DcapQuoteVerifier (dcap-qvl adapter, mocked getCollateralAndVerify)", () => {
  it("maps TD10 fields", async () => {
    const r = await new DcapQuoteVerifier({ getCollateralAndVerify: qvl(td()) }).verifyQuote(QUOTE);
    expect(r).toMatchObject({ ok: true, tcbStatus: "UpToDate", rtmr3: "04".repeat(48), mrConfigId: "05".repeat(48), mrTd: "06".repeat(48) });
  });
  it("maps TD15 nested base", async () => {
    const r = await new DcapQuoteVerifier({ getCollateralAndVerify: qvl({ base: td() }, "UpToDate", "td15") }).verifyQuote(QUOTE);
    expect(r.ok).toBe(true);
  });
  it("rejects TDX debug bit", async () => {
    const a = b(8, 0); a[0] = 1;
    expect(await new DcapQuoteVerifier({ getCollateralAndVerify: qvl(td({ tdAttributes: a })) }).verifyQuote(QUOTE)).toEqual({ ok: false, reason: "tdx_debug_rejected" });
  });
  it("collateral/verify failure ⇒ deny", async () => {
    const r = await new DcapQuoteVerifier({ getCollateralAndVerify: async () => { throw new Error("offline"); } }).verifyQuote(QUOTE);
    expect(r).toEqual({ ok: false, reason: "dcap_verify_failed" });
  });
  it("SGX quote / bad hex ⇒ deny", async () => {
    expect((await new DcapQuoteVerifier({ getCollateralAndVerify: qvl({}, "UpToDate", "sgx") }).verifyQuote(QUOTE)).ok).toBe(false);
    expect(await new DcapQuoteVerifier({ getCollateralAndVerify: qvl(td()) }).verifyQuote("zz")).toEqual({ ok: false, reason: "quote_hex_invalid" });
  });
  it("real dcap-qvl on garbage quote ⇒ deny (no network needed to fail)", async () => {
    expect((await new DcapQuoteVerifier({ pccsUrl: "http://127.0.0.1:9/" }).verifyQuote("00".repeat(16))).ok).toBe(false);
  });
});

describe("DcapGatewayVerifier", () => {
  const g = { intel_quote: QUOTE, signing_address: ADDR, request_nonce: NONCE };
  it("passes with bound report_data", async () => {
    expect((await new DcapGatewayVerifier(new DcapQuoteVerifier({ getCollateralAndVerify: qvl(td()) })).verifyGateway(g, NONCE)).ok).toBe(true);
  });
  it("denies nonce / report_data / TCB mismatch", async () => {
    const v = new DcapGatewayVerifier(new DcapQuoteVerifier({ getCollateralAndVerify: qvl(td()) }));
    expect((await v.verifyGateway({ ...g, request_nonce: "cd".repeat(32) }, NONCE)).ok).toBe(false);
    expect((await v.verifyGateway({ ...g, signing_address: "0x" + "22".repeat(20) }, NONCE)).reason).toBe("gateway_report_data_mismatch");
    const old = new DcapGatewayVerifier(new DcapQuoteVerifier({ getCollateralAndVerify: qvl(td(), "OutOfDate") }));
    expect((await old.verifyGateway(g, NONCE)).reason).toBe("gateway_tcb_policy");
  });
});

describe("NrasGpuVerifier (mocked NRAS)", () => {
  const payload = JSON.stringify({ nonce: NONCE, evidence_list: [{ evidence: "e", certificate: "c" }], arch: "HOPPER" });
  const CH = makeTestChain("a");
  const privateKey = CH.leafKey; const publicKey = createPublicKey(privateKey);
  const KID = "test-kid";
  const PINS = { [CH.interSpki]: "test intermediate" };
  const pubJwk = { ...publicKey.export({ format: "jwk" }), kid: KID, x5c: [CH.leafB64, CH.interB64, CH.rootB64] } as Jwk;
  const jwksFetch: JwksFetch = async (url) => { expect(url).toBe(NRAS_JWKS_URL); return { keys: [pubJwk] }; };
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const sign = (claims: unknown, hdr: object = { alg: "ES384", kid: KID, typ: "JWT" }, key = privateKey) => {
    const si = `${b64(hdr)}.${b64(claims)}`;
    return `${si}.${cryptoSign("sha384", Buffer.from(si), { key, dsaEncoding: "ieee-p1363" }).toString("base64url")}`;
  };
  const exp = () => Math.floor(Date.now() / 1000) + 600;
  const jwt = (claims: object) => sign({ iss: NRAS_ISSUER, exp: exp(), ...claims });
  const bodyFor = (hdr: string | null) => hdr === null ? "[]" : JSON.stringify([["JWT", jwt({ "x-nvidia-overall-att-result": hdr === "true" })]]);
  const nras = (hdr: string | null, status = 200, body = bodyFor(hdr)): NrasFetch => async (url, init) => {
    expect(url).toMatch(/\/v3\/attest\/gpu$/); expect(init.body).toBe(payload);
    return { ok: status < 300, status, headers: { get: (n) => (n === "x-nvidia-overall-att-result" ? hdr : null) }, text: async () => body };
  };
  it("passes when overall result true", async () => { expect(await new NrasGpuVerifier({ x5cPins: PINS, jwksFetch, fetch: nras("true") }).verifyGpu(payload, NONCE)).toEqual({ ok: true }); });
  it("R1: body JWT decides, header ignored (true/false/missing/malformed)", async () => {
    const v = (hdr: string | null, body: string) => new NrasGpuVerifier({ x5cPins: PINS, jwksFetch, fetch: nras(hdr, 200, body) }).verifyGpu(payload, NONCE);
    expect(await v(null, JSON.stringify([["JWT", jwt({ "x-nvidia-overall-att-result": true })]]))).toEqual({ ok: true });
    expect((await v("true", JSON.stringify([["JWT", jwt({ "x-nvidia-overall-att-result": false })]]))).reason).toBe("nras_overall_result_false");
    expect((await v("true", JSON.stringify([["JWT", jwt({ "x-nvidia-overall-att-result": "true" })]]))).reason).toBe("nras_overall_result_false");
    expect((await v("true", JSON.stringify([["JWT", jwt({})]]))).reason).toBe("nras_overall_result_false");
    expect((await v("true", "")).reason).toBe("nras_body_not_json");
    expect((await v("true", "[]")).reason).toBe("nras_jwt_missing");
    expect((await v("true", JSON.stringify([["JWT", "notajwt"]]))).reason).toBe("nras_jwt_malformed");
  });
  it("J1: JWT signature verified against JWKS before claims (fail-closed matrix)", async () => {
    const body = (j: string) => JSON.stringify([["JWT", j]]);
    const v = (j: string, jf: JwksFetch = jwksFetch, now?: () => number) => new NrasGpuVerifier({ x5cPins: PINS, jwksFetch: jf, now, fetch: nras("true", 200, body(j)) }).verifyGpu(payload, NONCE);
    const ok = jwt({ "x-nvidia-overall-att-result": true });
    expect(await v(ok)).toEqual({ ok: true });
    // unsigned legacy blob (pre-J1 shape) now denied
    expect((await v(`e30.${b64({ "x-nvidia-overall-att-result": true, exp: exp() })}.sig`)).reason).toBe("nras_jwt_alg_rejected");
    const other = generateKeyPairSync("ec", { namedCurve: "P-384" }).privateKey;
    expect((await v(sign({ iss: NRAS_ISSUER, exp: exp(), "x-nvidia-overall-att-result": true }, undefined, other))).reason).toBe("nras_jwt_bad_signature");
    const [h, , sg] = ok.split("."); // tampered payload
    expect((await v(`${h}.${b64({ exp: exp(), "x-nvidia-overall-att-result": true, extra: 1 })}.${sg}`)).reason).toBe("nras_jwt_bad_signature");
    expect((await v(sign({ iss: NRAS_ISSUER, exp: exp(), "x-nvidia-overall-att-result": true }, { alg: "none", kid: KID }))).reason).toBe("nras_jwt_alg_rejected");
    expect((await v(sign({ iss: NRAS_ISSUER, exp: exp(), "x-nvidia-overall-att-result": true }, { alg: "HS256", kid: KID }))).reason).toBe("nras_jwt_alg_rejected");
    expect((await v(sign({ iss: NRAS_ISSUER, exp: exp(), "x-nvidia-overall-att-result": true }, { alg: "ES384" }))).reason).toBe("nras_jwt_kid_missing");
    expect((await v(sign({ iss: NRAS_ISSUER, exp: exp(), "x-nvidia-overall-att-result": true }, { alg: "ES384", kid: "other" }))).reason).toBe("nras_jwks_kid_not_found");
    expect((await v(sign({ iss: NRAS_ISSUER, "x-nvidia-overall-att-result": true }))).reason).toBe("nras_jwt_exp_missing");
    expect((await v(ok, jwksFetch, () => Date.now() + 3_600_000)).reason).toBe("nras_jwt_expired");
    expect((await v(sign({ iss: NRAS_ISSUER, exp: exp() + 9999, nbf: exp() + 9999, "x-nvidia-overall-att-result": true }))).reason).toBe("nras_jwt_not_yet_valid");
    expect((await v(ok, async () => { throw new Error("net"); })).reason).toBe("nras_jwks_unavailable");
    expect((await v(ok, async () => ({ keys: [] }))).reason).toBe("nras_jwks_unavailable");
    expect((await v(ok, async () => ({ keys: [pubJwk, pubJwk] }))).reason).toBe("nras_jwks_kid_not_found");
    expect((await v(ok, async () => ({ keys: [{ ...pubJwk, crv: "P-256" }] }))).reason).toBe("nras_jwks_key_invalid");
  });
  it("J1: JWKS cache honors TTL", async () => {
    let n = 0; let t = 0;
    const f = cachedJwksFetch(async () => { n++; return { keys: [] }; }, 1000, () => t);
    await f("u"); await f("u"); expect(n).toBe(1); t = 1001; await f("u"); expect(n).toBe(2);
  });
  const okJwt = () => jwt({ "x-nvidia-overall-att-result": true });
  const run = (jf: JwksFetch, j = okJwt(), pins: Record<string, string> = PINS) =>
    new NrasGpuVerifier({ x5cPins: pins, jwksFetch: jf, fetch: nras("true", 200, JSON.stringify([["JWT", j]])) }).verifyGpu(payload, NONCE);
  const one = (k: Jwk): JwksFetch => async () => ({ keys: [k] });
  it("J2: pinned x5c chain happy path (pin on intermediate or root)", async () => {
    expect(await run(one(pubJwk))).toEqual({ ok: true });
    expect(await run(one({ ...pubJwk, x5c: [CH.leafB64, CH.interB64] }))).toEqual({ ok: true });
    expect(await run(one(pubJwk), okJwt(), { [CH.rootSpki]: "root" })).toEqual({ ok: true });
  });
  it("J2: deny when x5c missing / malformed (bare coords never trusted)", async () => {
    const { x5c: _x, ...bare } = pubJwk;
    expect((await run(one(bare as Jwk))).reason).toBe("nras_jwks_x5c_missing");
    expect((await run(one({ ...pubJwk, x5c: [CH.leafB64] }))).reason).toBe("nras_jwks_x5c_missing");
    expect((await run(one({ ...pubJwk, x5c: [] }))).reason).toBe("nras_jwks_x5c_missing");
    expect((await run(one({ ...pubJwk, x5c: ["bm90LWEtY2VydA==", CH.interB64] }))).reason).toBe("nras_jwks_x5c_invalid");
  });
  it("J2: deny when leaf SPKI ≠ JWK x/y", async () => {
    const other = generateKeyPairSync("ec", { namedCurve: "P-384" });
    const oj = other.publicKey.export({ format: "jwk" }) as any;
    // JWK coords from attacker key, signed by attacker, but x5c leaf is the genuine chain ⇒ deny
    const evil = { ...pubJwk, x: oj.x, y: oj.y } as Jwk;
    expect((await run(one(evil), sign({ iss: NRAS_ISSUER, exp: exp(), "x-nvidia-overall-att-result": true }, undefined, other.privateKey))).reason).toBe("nras_jwks_x5c_leaf_mismatch");
  });
  it("J2 soft: leaf subject O must be NVIDIA Corporation (missing/wrong ⇒ deny; injectable)", async () => {
    expect(NRAS_LEAF_ORG).toBe("NVIDIA Corporation");
    expect(verifyJwkX5c(pubJwk, PINS, Date.now())).toMatchObject({ ok: true });
    expect(verifyJwkX5c(pubJwk, PINS, Date.now(), "Evil Corp")).toEqual({ ok: false, reason: "nras_jwks_x5c_leaf_org_mismatch" });
    expect((await new NrasGpuVerifier({ x5cPins: PINS, leafOrg: "Evil Corp", jwksFetch: one(pubJwk), fetch: nras("true", 200, JSON.stringify([["JWT", okJwt()]])) }).verifyGpu(payload, NONCE)).reason).toBe("nras_jwks_x5c_leaf_org_mismatch");
    const mk = (subj: string) => { const c = makeTestChain("o", subj); const { d: _d, ...pub } = c.leafKey.export({ format: "jwk" }) as any; const j = { ...pub, kid: KID, x5c: [c.leafB64, c.interB64, c.rootB64] } as Jwk; return { c, j }; };
    const noO = mk("/C=US/CN=No Org Leaf"); expect(verifyJwkX5c(noO.j, { [noO.c.interSpki]: "i" }, Date.now())).toEqual({ ok: false, reason: "nras_jwks_x5c_leaf_org_missing" });
    const bad = mk("/C=US/O=NVIDIA Corp/CN=Lookalike"); expect(verifyJwkX5c(bad.j, { [bad.c.interSpki]: "i" }, Date.now())).toEqual({ ok: false, reason: "nras_jwks_x5c_leaf_org_mismatch" });
    expect(checkLeafOrg(new (await import("node:crypto")).X509Certificate(Buffer.from(CH.leafB64, "base64")), NRAS_LEAF_ORG)).toEqual({ ok: true });
  });
  it("J2: deny when chain lacks pinned CA/intermediate or is broken", async () => {
    expect((await run(one(pubJwk), okJwt(), { ["00".repeat(32)]: "x" })).reason).toBe("nras_jwks_x5c_unpinned");
    expect((await run(one(pubJwk), okJwt(), { [CH.rootSpki]: "root" }).then(() => run(one({ ...pubJwk, x5c: [CH.leafB64, CH.interB64] }), okJwt(), { [CH.rootSpki]: "root" }))).reason).toBe("nras_jwks_x5c_unpinned");
    const OT = makeTestChain("b"); // foreign intermediate that did not issue our leaf, but IS pinned
    expect((await run(one({ ...pubJwk, x5c: [CH.leafB64, OT.interB64] }), okJwt(), { [OT.interSpki]: "other" })).reason).toBe("nras_jwks_x5c_chain_broken");
    // default prod pins never match a synthetic chain
    expect(verifyJwkX5c(pubJwk, NRAS_X5C_PINNED_SPKI_SHA256, Date.now())).toEqual({ ok: false, reason: "nras_jwks_x5c_unpinned" });
    expect(verifyJwkX5c(pubJwk, PINS, Date.now() + 10 * 86_400_000)).toEqual({ ok: false, reason: "nras_jwks_x5c_expired" });
  });
  it("J2: prod pin set = live NVIDIA intermediates 004/005 (digest-only)", () => {
    expect(Object.keys(NRAS_X5C_PINNED_SPKI_SHA256).sort()).toEqual([
      "ba14d00377699189b6762c22c744a9dbdc62aa9396097ada7150426c6ff39afc", "fd32837f954e2c45db073105166dfe6985ae0480bb113fba63b091a75affe896"]);
    expect(Object.isFrozen(NRAS_X5C_PINNED_SPKI_SHA256)).toBe(true);
  });
  it("J3: unknown kid → one forced refetch → found → pass", async () => {
    const calls: Array<boolean> = []; let stale = true;
    const inner: JwksFetch = async (_u, o) => { calls.push(!!o?.force); const r = stale ? { keys: [{ ...pubJwk, kid: "old" }] } : { keys: [pubJwk] }; stale = false; return r; };
    const v = new NrasGpuVerifier({ x5cPins: PINS, jwksFetch: inner, fetch: nras("true", 200, JSON.stringify([["JWT", okJwt()]])) });
    expect(await v.verifyGpu(payload, NONCE)).toEqual({ ok: true });
    expect(calls).toEqual([false, true]);
    expect(await v.verifyGpu(payload, NONCE)).toEqual({ ok: true }); // cached after refetch
    expect(calls).toEqual([false, true]);
  });
  it("J3: unknown kid after refetch ⇒ deny; capped at 1 refetch", async () => {
    const calls: boolean[] = [];
    const inner: JwksFetch = async (_u, o) => { calls.push(!!o?.force); return { keys: [{ ...pubJwk, kid: "old" }] }; };
    expect((await run(inner)).reason).toBe("nras_jwks_kid_not_found");
    expect(calls).toEqual([false, true]);
    const c2: boolean[] = [];
    expect((await run(async (_u, o) => { c2.push(!!o?.force); if (o?.force) throw new Error("net"); return { keys: [{ ...pubJwk, kid: "old" }] }; })).reason).toBe("nras_jwks_unavailable");
    expect(c2).toEqual([false, true]);
  });
  it("J3: no refetch when kid known in cache; 10m TTL kept", async () => {
    const calls: boolean[] = [];
    const inner: JwksFetch = async (_u, o) => { calls.push(!!o?.force); return { keys: [pubJwk] }; };
    const v = new NrasGpuVerifier({ x5cPins: PINS, jwksFetch: inner, fetch: nras("true", 200, JSON.stringify([["JWT", okJwt()]])) });
    expect(await v.verifyGpu(payload, NONCE)).toEqual({ ok: true });
    expect(await v.verifyGpu(payload, NONCE)).toEqual({ ok: true });
    expect(calls).toEqual([false]);
    let n = 0; let t = 0; const f = cachedJwksFetch(async () => { n++; return { keys: [] }; }, undefined, () => t);
    await f("u"); t = 599_999; await f("u"); expect(n).toBe(1); await f("u", { force: true }); expect(n).toBe(2); t = 1_300_000; await f("u"); expect(n).toBe(3);
  });
  it("soft: iss must equal NRAS issuer (missing ⇒ deny, fail-closed)", async () => {
    expect((await run(one(pubJwk), sign({ exp: exp(), "x-nvidia-overall-att-result": true }))).reason).toBe("nras_jwt_iss_missing");
    expect((await run(one(pubJwk), sign({ iss: "https://evil.example", exp: exp(), "x-nvidia-overall-att-result": true }))).reason).toBe("nras_jwt_iss_mismatch");
  });
  it("R2: arbitrary plug name denied in prod guard", () => {
    expect(() => assertPlugsProductionReady({ responseBinder: { name: "totally-trusted", verify: async () => ({ ok: true }) } }, { bindOnly: true })).toThrow("unwired_plug_forbidden");
  });
  it("NRAS false ⇒ deny", async () => { expect((await new NrasGpuVerifier({ x5cPins: PINS, jwksFetch, fetch: nras("false") }).verifyGpu(payload, NONCE)).reason).toBe("nras_overall_result_false"); });
  it("HTTP error / network error ⇒ deny", async () => {
    expect((await new NrasGpuVerifier({ x5cPins: PINS, jwksFetch, fetch: nras("true", 500) }).verifyGpu(payload, NONCE)).ok).toBe(false);
    expect((await new NrasGpuVerifier({ x5cPins: PINS, fetch: async () => { throw new Error("x"); } }).verifyGpu(payload, NONCE)).reason).toBe("nras_network_error");
  });
  it("nonce mismatch / non-string ⇒ deny before network", async () => {
    const f: NrasFetch = async () => { throw new Error("must not call"); };
    expect((await new NrasGpuVerifier({ x5cPins: PINS, fetch: f }).verifyGpu(payload, "cd".repeat(32))).reason).toBe("nvidia_nonce_mismatch");
    expect((await new NrasGpuVerifier({ x5cPins: PINS, fetch: f }).verifyGpu({ nonce: NONCE }, NONCE)).reason).toBe("nvidia_payload_not_string");
  });
});

describe("NobleResponseBinder", () => {
  const text = expectedSignedText("m", new TextEncoder().encode("req"), new TextEncoder().encode("resp"));
  const sk = secp.utils.randomSecretKey();
  const addr = "0x" + ethAddress(secp.getPublicKey(sk));
  const rec = secp.sign(eip191Digest(text), sk, { format: "recovered", prehash: false });
  const ethSig = "0x" + Buffer.from([...rec.slice(1), rec[0]! + 27]).toString("hex");
  const binder = new NobleResponseBinder();
  it("EIP-191 recover ok", async () => { expect(await binder.verify(text, ethSig, addr, "ecdsa")).toEqual({ ok: true }); });
  it("EIP-191 wrong sig / wrong text ⇒ deny", async () => {
    const bad = ethSig.slice(0, 10) + (ethSig[10] === "0" ? "1" : "0") + ethSig.slice(11);
    expect((await binder.verify(text, bad, addr, "ecdsa")).ok).toBe(false);
    expect((await binder.verify(text + "x", ethSig, addr, "ecdsa")).ok).toBe(false);
  });
  const esk = ed.utils.randomSecretKey(), epk = ed.getPublicKey(esk);
  const esig = Buffer.from(ed.sign(new TextEncoder().encode(text), esk)).toString("hex");
  it("ed25519 ok", async () => { expect(await binder.verify(text, esig, Buffer.from(epk).toString("hex"), "ed25519")).toEqual({ ok: true }); });
  it("ed25519 wrong key ⇒ deny", async () => {
    const other = Buffer.from(ed.getPublicKey(ed.utils.randomSecretKey())).toString("hex");
    expect((await binder.verify(text, esig, other, "ed25519")).ok).toBe(false);
  });
  it("bindCompletion end-to-end with real binder; gateway-only still denied", async () => {
    const req = new TextEncoder().encode("req"), resp = new TextEncoder().encode("resp");
    const t = expectedSignedText("m", req, resp);
    const r2 = secp.sign(eip191Digest(t), sk, { format: "recovered", prehash: false });
    const sig = "0x" + Buffer.from([...r2.slice(1), r2[0]! + 27]).toString("hex");
    const v = [{ modelId: "m", signingAddress: addr, signingAlgo: "ecdsa" } as unknown as VerifiedAttestation];
    const ev = (kind: string) => ({ modelId: "m", requestBody: req, responseBody: resp, requestHeaders: { "x-no-aliasing": "true" }, signingAlgo: "ecdsa" as const,
      signature: { text: t, signature: sig, signing_address: addr, signing_algo: "ecdsa", signature_kind: kind } });
    expect((await bindCompletion(v, ev("provider_tee"), binder)).ok).toBe(true);
    expect(await bindCompletion(v, ev("gateway"), binder)).toMatchObject({ ok: false, reason: "gateway_signature_only" });
  });
});

describe("production guard", () => {
  it("real wired plugs pass; stubs/mocks fail", () => {
    const real = { quoteVerifier: new DcapQuoteVerifier({ getCollateralAndVerify: qvl(td()) }), gpuVerifier: new NrasGpuVerifier(),
      gatewayVerifier: new DcapGatewayVerifier(), responseBinder: new NobleResponseBinder() };
    expect(() => assertPlugsProductionReady(real, { requireBinder: true })).not.toThrow();
    expect(() => assertPlugsProductionReady({ ...real, gpuVerifier: new StubFailClosedVerifier() })).toThrow(/unwired_plug_forbidden/);
    expect(() => assertPlugsProductionReady({ ...real, responseBinder: new StubFailClosedResponseBinder() })).toThrow(/unwired_plug_forbidden/);
    expect(() => assertPlugsProductionReady({ ...real, quoteVerifier: { name: "dcap-quote-verifier-stub" } as any })).toThrow(/unwired_plug_forbidden/);
    expect(() => new AttestationClient({ requireProductionPlugs: true, ...real })).not.toThrow();
  });
  it("shipped allowlist is the two PS-approved GLM pins", () => {
    const raw = JSON.parse(readFileSync(new URL("../allowlist/measurements.json", import.meta.url), "utf8"));
    expect(raw.entries).toHaveLength(2);
    expect(raw.entries[0]).toMatchObject({
      model_id: "z-ai/glm-5.3-flash",
      privacy_security_approver: "Privacy Security",
      effective_from: "2026-10-29T17:00:00Z",
      rtmr3: "463b2e18f0dde370e2be8d6b4cb07aac5efc4d8bc712cea2714d103e4db57cea4ce50197973d557306b25e70f82277d6",
    });
    expect(raw.entries[1]).toMatchObject({
      model_id: "z-ai/glm-5.3-flash",
      privacy_security_approver: "Privacy Security",
      effective_from: "2026-10-29T17:10:00Z",
      rtmr3: "e0f6c83eec48dfbfdb41d438a96783bcde1de18a1ac73705e2a8e24c2bc2051cbbf05ec0e856fed86498316a1b3e1bec",
    });
    expect(raw.entries.every((e: { test_only?: boolean }) => e.test_only === undefined)).toBe(true);
  });
  it("AttestationClient still constructs with defaults (stub)", () => { expect(() => new AttestationClient()).not.toThrow(); });
});
