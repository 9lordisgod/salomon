import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AttestationClient, AttestationError, DigestLogger, MockQuoteVerifier, MockGatewayVerifier, StubFailClosedVerifier,
  expectedMrConfigId, expectedReportData, replayRtmr, recomputeImr3Digests, imr3EventDigest, verifyReport, assertPlugsProductionReady,
  DcapQuoteVerifier, DcapGatewayVerifier, NrasGpuVerifier, StubFailClosedResponseBinder, assertBoundCompletion, loadAllowlist, nonceHash, DEFAULT_POLICY,
  type MeasurementPolicy, type DigestLogRecord, type AllowlistEntry,
} from "../src/index.js";

const ADDR = "0x" + "ab".repeat(20);
const COMPOSE = '{"services":{"vllm":{}}}';
const EVENTS = [{ imr: 3, event_type: 134217729, event: "app-id", event_payload: "11".repeat(20), digest: "" },
  { imr: 0, event_type: 1, event: "ignored", event_payload: "" },
  { imr: 3, event_type: 134217729, event: "compose-hash", event_payload: "33".repeat(32) }];
const IMR3_DIGESTS = recomputeImr3Digests(EVENTS);
const { composeSha256, mrConfigId } = expectedMrConfigId(COMPOSE);
const RTMR3 = replayRtmr(EVENTS);
const MODEL = "deepseek-ai/DeepSeek-V3.1";
const policy: MeasurementPolicy = { ...DEFAULT_POLICY };
const TEST_ENTRY: AllowlistEntry = { model_id: MODEL, mrconfigid: mrConfigId, app_compose_sha256: composeSha256, rtmr3: RTMR3,
  event_log_digests: IMR3_DIGESTS, effective_from: "2026-01-01T00:00:00Z", notes: "unit-test fixture",
  privacy_security_approver: "test-fixture-not-approved", test_only: true };
const dir = mkdtempSync(join(tmpdir(), "attest-"));
const TEST_AL = join(dir, "measurements.json");
writeFileSync(TEST_AL, JSON.stringify({ entries: [TEST_ENTRY] }));
const EMPTY_AL = join(dir, "empty.json");
writeFileSync(EMPTY_AL, JSON.stringify({ entries: [] }));
const allowlist = loadAllowlist(TEST_AL, { allowTestOnly: true, env: {} });

const mkAtt = (nonce: string, over: Record<string, unknown> = {}) => ({ signing_address: ADDR, intel_quote: "deadbeef",
  event_log: EVENTS, info: { app_compose: COMPOSE }, request_nonce: nonce, compose_manager_attestation: mkCm(nonce), ...over });
// G4: CM evidence is required on the verified path; tests carry a mock CM whose quote ("cafe") the mock routes.
const CM_AH = "c".repeat(64);
const mkCm = (nonce: string) => ({ quote: "cafe", nonce, nonce_source: "client", actions_hash: CM_AH, report_data: CM_AH + nonce,
  actions: [{ action: "compose_up", file: "prod/a.yaml", file_sha256: "d".repeat(64), tag: "v1", commit: "e".repeat(40) }] });
const mkReport = (nonce: string, atts: unknown[] = [mkAtt(nonce)], gw: unknown = { request_nonce: nonce }) =>
  ({ gateway_attestation: gw, model_attestations: atts }) as any;
const mock = (nonce: string, over: Record<string, unknown> = {}, gpuOk = true) => {
  const m = new MockQuoteVerifier({ tcbStatus: "UpToDate", advisoryIds: [],
    reportData: expectedReportData(ADDR, nonce), rtmr3: RTMR3, mrConfigId, ...over } as any, { iUnderstandThisIsTestOnly: true, gpuOk });
  const base = m.verifyQuote.bind(m);
  (m as any).verifyQuote = async (q?: string) => q === "cafe"
    ? { ok: true, tcbStatus: "UpToDate", advisoryIds: [], reportData: CM_AH + nonce, rtmr3: "00".repeat(48), mrConfigId: "00".repeat(48) } : base();
  return m;
};
const gwOk = new MockGatewayVerifier(true, { iUnderstandThisIsTestOnly: true });
const N = "a".repeat(64);
const mkLogger = (lines: string[] = []) => new DigestLogger((l) => lines.push(l));
const deps = (qv = mock(N), over: Record<string, unknown> = {}) =>
  ({ quoteVerifier: qv, gpuVerifier: qv, gatewayVerifier: gwOk, policy, allowlist, logger: mkLogger(), ...over }) as any;

describe("fail-closed verify", () => {
  it("empty model_attestations → DENY", async () => {
    await expect(verifyReport(mkReport(N, []), MODEL, N, deps())).rejects.toMatchObject({ check: "evidence_present" });
    await expect(verifyReport({ gateway_attestation: { request_nonce: N } }, MODEL, N, deps())).rejects.toBeInstanceOf(AttestationError);
  });
  it("gateway_attestation missing → DENY (model evidence alone never enough)", async () => {
    await expect(verifyReport(mkReport(N, [mkAtt(N)], null), MODEL, N, deps())).rejects.toMatchObject({ check: "gateway", reason: "gateway_attestation_missing" });
  });
  it("gateway verify fail / default stub gateway verifier → DENY", async () => {
    const bad = new MockGatewayVerifier(false, { iUnderstandThisIsTestOnly: true });
    await expect(verifyReport(mkReport(N), MODEL, N, deps(mock(N), { gatewayVerifier: bad }))).rejects.toMatchObject({ check: "gateway" });
    await expect(verifyReport(mkReport(N), MODEL, N, deps(mock(N), { gatewayVerifier: new StubFailClosedVerifier() })))
      .rejects.toMatchObject({ check: "gateway", reason: "gateway_verifier_not_configured" });
  });
  it("nonce mismatch → DENY (request_nonce and report_data)", async () => {
    await expect(verifyReport(mkReport(N, [mkAtt("b".repeat(64))]), MODEL, N, deps())).rejects.toMatchObject({ check: "nonce_binding" });
    const qv = mock(N, { reportData: expectedReportData(ADDR, "c".repeat(64)) });
    await expect(verifyReport(mkReport(N), MODEL, N, deps(qv))).rejects.toMatchObject({ check: "nonce_binding" });
  });
  it("QuoteVerifier not configured → DENY", async () => {
    const s = new StubFailClosedVerifier();
    await expect(verifyReport(mkReport(N), MODEL, N, deps(s as any))).rejects.toMatchObject({ check: "quote", reason: "quote_verifier_not_configured" });
  });
  it("allowlist miss / empty allowlist → DENY", async () => {
    await expect(verifyReport(mkReport(N), MODEL, N, deps(mock(N), { allowlist: [] }))).rejects.toMatchObject({ check: "allowlist_load" });
    await expect(verifyReport(mkReport(N), "other/model", N, deps())).rejects.toMatchObject({ check: "allowlist" });
    await expect(verifyReport(mkReport(N), MODEL, N, deps(mock(N), { allowlist: [{ ...allowlist[0], rtmr3: "ff".repeat(48) }] }))).rejects.toMatchObject({ check: "allowlist" });
    expect(() => loadAllowlist(EMPTY_AL, { allowTestOnly: true, env: {} })).toThrow(/empty/);
    expect(() => loadAllowlist(join(dir, "nope.json"))).toThrow(AttestationError);
    // Item (6) + Phase2 second instance: two PS-approved GLM pins (not empty deny-all).
    const shipped = loadAllowlist("allowlist/measurements.json");
    expect(shipped).toHaveLength(2);
    expect(shipped[0]).toMatchObject({
      model_id: "z-ai/glm-5.3-flash",
      privacy_security_approver: "Privacy Security",
      effective_from: "2026-10-29T17:00:00Z",
      rtmr3: "463b2e18f0dde370e2be8d6b4cb07aac5efc4d8bc712cea2714d103e4db57cea4ce50197973d557306b25e70f82277d6",
    });
    expect(shipped[1]).toMatchObject({
      model_id: "z-ai/glm-5.3-flash",
      privacy_security_approver: "Privacy Security",
      effective_from: "2026-10-29T17:10:00Z",
      rtmr3: "e0f6c83eec48dfbfdb41d438a96783bcde1de18a1ac73705e2a8e24c2bc2051cbbf05ec0e856fed86498316a1b3e1bec",
    });
    expect(shipped.every((e) => e.test_only !== true)).toBe(true);
  });
  it("test_only entries never load without opt-in or in production", () => {
    expect(() => loadAllowlist(TEST_AL, { env: {} })).toThrow(/empty/);
    expect(() => loadAllowlist(TEST_AL, { allowTestOnly: true, env: { NODE_ENV: "production" } })).toThrow(/empty/);
  });
  it("nvidia_payload present but GPU verify fails → DENY; absent ok when require_gpu=false; absent DENY when require_gpu=true", async () => {
    await expect(verifyReport(mkReport(N, [mkAtt(N, { nvidia_payload: { evidence: "x" } })]), MODEL, N, deps(mock(N, {}, false))))
      .rejects.toMatchObject({ check: "nvidia" });
    expect(DEFAULT_POLICY.requireNvidiaEvidence).toBe(false);
    await expect(verifyReport(mkReport(N), MODEL, N, deps(mock(N), { policy: { ...policy, requireNvidiaEvidence: true } })))
      .rejects.toMatchObject({ check: "nvidia" });
  });
  it("one bad candidate denies all; compose tamper denies", async () => {
    await expect(verifyReport(mkReport(N, [mkAtt(N), mkAtt(N, { event_log: [] })]), MODEL, N, deps())).rejects.toMatchObject({ check: "rtmr3_replay" });
    await expect(verifyReport(mkReport(N, [mkAtt(N, { info: { app_compose: COMPOSE + " " } })]), MODEL, N, deps())).rejects.toMatchObject({ check: "compose_mrconfigid" });
  });
  it("mocks require explicit test-only opt-in", () => {
    expect(() => new MockQuoteVerifier(null, {} as any)).toThrow();
    expect(() => new MockGatewayVerifier(true, {} as any)).toThrow();
  });
});

describe("digest logger", () => {
  it("rejects prompt / apiKey / raw nonce / credential values", () => {
    const l = mkLogger();
    // @ts-expect-error prompt is typed `never`
    const bad: DigestLogRecord = { event: "attestation_verify", modelId: "m", nonceHash: "x", result: "fail", prompt: "hi" };
    expect(() => l.log(bad)).toThrow(/prompt/);
    expect(() => l.log({ event: "attestation_verify", modelId: "m", nonceHash: "x", result: "fail", ...({ apiKey: "k" } as any) })).toThrow();
    expect(() => l.log({ event: "attestation_verify", modelId: "m", nonceHash: "x", result: "fail", ...({ nonce: N } as any) })).toThrow();
    expect(() => l.log({ event: "attestation_verify", modelId: "m", nonceHash: "x", result: "fail", reason: "Bearer sk-abc" })).toThrow();
  });
  it("verify emits nonceHash, never raw nonce", async () => {
    const lines: string[] = [];
    await verifyReport(mkReport(N), MODEL, N, deps(mock(N), { logger: mkLogger(lines) }));
    await expect(verifyReport(mkReport(N, []), MODEL, N, deps(mock(N), { logger: mkLogger(lines) }))).rejects.toThrow();
    expect(lines.length).toBeGreaterThanOrEqual(3);
    for (const l of lines) { expect(l).not.toContain(N); expect(JSON.parse(l).nonceHash).toBe(nonceHash(N)); }
  });
});

describe("AttestationClient", () => {
  const fetchFor = (body: (nonce: string) => unknown, seen: { url?: string; headers?: Record<string, string> } = {}) =>
    async (url: string, init: { headers: Record<string, string> }) => {
      seen.url = url; seen.headers = init.headers;
      const nonce = new URL(url).searchParams.get("nonce")!;
      return { ok: true, status: 200, json: async () => body(nonce) };
    };
  const env = { NEAR_AI_CLOUD_API_KEY: "test-key-not-real" };

  it("default client (shipped GLM allowlist + stub verifiers) denies and never becomes ready", async () => {
    const lines: string[] = [];
    const c = new AttestationClient({ env, fetchImpl: fetchFor((n) => mkReport(n)), logger: mkLogger(lines) });
    // Allowlist loads (item 6 pin present); stubs still fail closed before remote use.
    await expect(c.verifyForModel(MODEL)).rejects.toMatchObject({ check: "gateway", reason: "gateway_verifier_not_configured" });
    expect(() => c.assertReadyForRemoteInference(MODEL)).toThrow(AttestationError);
    const c2 = new AttestationClient({ env, allowlistPath: TEST_AL, allowTestOnly: true, fetchImpl: fetchFor((n) => mkReport(n)), logger: mkLogger(lines) });
    await expect(c2.verifyForModel(MODEL)).rejects.toMatchObject({ check: "gateway", reason: "gateway_verifier_not_configured" });
    expect(lines.join("")).not.toContain("test-key-not-real");
  });
  it("SKIP_ATTEST / ALLOW_NO_ATTEST refuse AttestationClient construction", () => {
    for (const f of ["SKIP_ATTEST", "ALLOW_NO_ATTEST", "NEAR_SKIP_ATTEST", "ATTEST_SKIP"] as const) {
      expect(() => new AttestationClient({ env: { [f]: "1", NEAR_AI_CLOUD_API_KEY: "x" } }))
        .toThrow(AttestationError);
      try { new AttestationClient({ env: { [f]: "1" } }); expect.fail("should throw"); }
      catch (e) { expect(e).toMatchObject({ check: "skip_attest_banned" }); expect(String((e as Error).message)).toContain(f); }
    }
  });
  it("missing API key fails closed", async () => {
    const c = new AttestationClient({ env: {}, allowlistPath: TEST_AL, allowTestOnly: true, fetchImpl: fetchFor(() => ({})) });
    await expect(c.verifyForModel(MODEL)).rejects.toMatchObject({ check: "fetch" });
  });
  it("happy path: MockQuoteVerifier + mock gateway + test_only allowlist (allowTestOnly) → ready; required query + headers", async () => {
    const seen: any = {};
    let qv: MockQuoteVerifier | undefined;
    const f = fetchFor((n) => { qv = mock(n); return mkReport(n); }, seen);
    const lazy = { name: "lazy", verifyQuote: (q: string) => (qv as any)!.verifyQuote(q), verifyGpu: () => qv!.verifyGpu() };
    const c = new AttestationClient({ env, fetchImpl: f, quoteVerifier: lazy, gpuVerifier: lazy, gatewayVerifier: gwOk,
      allowlistPath: TEST_AL, allowTestOnly: true, logger: mkLogger() });
    const set = await c.verifyForModel(MODEL);
    expect(set).toHaveLength(1);
    expect(c.assertReadyForRemoteInference(MODEL)).toHaveLength(1);
    const u = new URL(seen.url);
    expect(u.pathname).toBe("/v1/attestation/report");
    expect(Object.fromEntries(u.searchParams)).toMatchObject({ model: MODEL, provider: "near", signing_algo: "ecdsa", include_tls_fingerprint: "false" });
    expect(seen.headers["x-no-aliasing"]).toBe("true");
    expect(() => c.assertReadyForRemoteInference("other-model")).toThrow();
  });
});

describe("RTMR3 recompute (NEAR docs)", () => {
  const sha384 = (...p: (Buffer | string)[]) => { const h = createHash("sha384"); p.forEach((x) => h.update(x)); return h.digest(); };
  it("happy recompute matches independent LE32 computation", () => {
    const t = Buffer.from([0x01, 0x00, 0x00, 0x08]); // 134217729 = 0x08000001 LE
    const d0 = sha384(t, ":", Buffer.from("app-id", "utf8"), ":", Buffer.from("11".repeat(20), "hex"));
    expect(imr3EventDigest(EVENTS[0] as any).equals(d0)).toBe(true);
    const d1 = sha384(t, ":", Buffer.from("compose-hash", "utf8"), ":", Buffer.from("33".repeat(32), "hex"));
    const r = sha384(sha384(Buffer.alloc(48), d0), d1).toString("hex");
    expect(replayRtmr(EVENTS as any)).toBe(r);
  });
  it("matching provided digest accepted; empty digest uses recomputed", () => {
    const withDigest = EVENTS.map((e) => e.imr === 3 ? { ...e, digest: "0x" + imr3EventDigest(e as any).toString("hex").toUpperCase() } : e);
    expect(replayRtmr(withDigest as any)).toBe(RTMR3);
  });
  it("digest mismatch → DENY (also via verifyReport)", async () => {
    const bad = EVENTS.map((e, i) => i === 0 ? { ...e, digest: "11".repeat(48) } : e);
    expect(() => replayRtmr(bad as any)).toThrow(/digest mismatch/);
    await expect(verifyReport(mkReport(N, [mkAtt(N, { event_log: bad })]), MODEL, N, deps())).rejects.toMatchObject({ check: "rtmr3_replay" });
  });
  it("payload tamper / missing event_type / bad hex → DENY", () => {
    expect(replayRtmr(EVENTS.map((e, i) => i === 2 ? { ...e, event_payload: "34".repeat(32) } : e) as any)).not.toBe(RTMR3);
    expect(() => replayRtmr([{ imr: 3, event: "x", event_payload: "" }] as any)).toThrow(/event_type/);
    expect(() => replayRtmr([{ imr: 3, event_type: 1, event: "x", event_payload: "zz" }] as any)).toThrow(/hex/);
  });
});

describe("nvidia_payload exact-string hash", () => {
  const PAYLOAD = '{"nonce":"' + N + '", "evidence_list":[]}'; // note non-canonical spacing
  const gpuEntry = (sha: string) => { const f = join(dir, "gpu-" + sha.slice(0, 8) + ".json");
    writeFileSync(f, JSON.stringify({ entries: [{ ...TEST_ENTRY, gpu_evidence_sha256: sha }] })); return loadAllowlist(f, { allowTestOnly: true, env: {} }); };
  it("pins sha256 of exact received string bytes (not JSON.stringify)", async () => {
    const exact = createHash("sha256").update(Buffer.from(PAYLOAD, "utf8")).digest("hex");
    const restringified = createHash("sha256").update(JSON.stringify(JSON.parse(PAYLOAD))).digest("hex");
    expect(exact).not.toBe(restringified);
    await expect(verifyReport(mkReport(N, [mkAtt(N, { nvidia_payload: PAYLOAD })]), MODEL, N, deps(mock(N), { allowlist: gpuEntry(exact) }))).resolves.toHaveLength(1);
    await expect(verifyReport(mkReport(N, [mkAtt(N, { nvidia_payload: PAYLOAD })]), MODEL, N, deps(mock(N), { allowlist: gpuEntry(restringified) })))
      .rejects.toMatchObject({ check: "allowlist" });
  });
  it("object payload with GPU pin present → fail closed", async () => {
    const exact = createHash("sha256").update(PAYLOAD).digest("hex");
    await expect(verifyReport(mkReport(N, [mkAtt(N, { nvidia_payload: JSON.parse(PAYLOAD) })]), MODEL, N, deps(mock(N), { allowlist: gpuEntry(exact) })))
      .rejects.toMatchObject({ check: "nvidia" });
  });
});

describe("production plug guard", () => {
  const prod = { NODE_ENV: "production" };
  it("prod refuses default stubs and stub binder (Dcap/Nras now real and allowed)", () => {
    expect(() => new AttestationClient({ env: prod, autoWireProductionPlugs: false })).toThrow(/unwired_plug_forbidden_in_production/);
    expect(() => new AttestationClient({ env: prod })).not.toThrow(); // auto-wired real plugs pass guard
    expect(() => new AttestationClient({ env: {}, requireProductionPlugs: true })).not.toThrow();
    expect(() => new AttestationClient({ env: prod, gpuVerifier: new StubFailClosedVerifier() })).toThrow(/unwired_plug_forbidden_in_production/); // explicit stub still refused
    expect(() => new AttestationClient({ env: prod, quoteVerifier: new DcapQuoteVerifier(), gpuVerifier: new NrasGpuVerifier(),
      gatewayVerifier: new DcapGatewayVerifier(), responseBinder: new StubFailClosedResponseBinder() })).toThrow(/unwired_plug_forbidden_in_production: responseBinder=stub-fail-closed-response-binder/);
    expect(() => new AttestationClient({ env: {}, requireProductionPlugs: true, quoteVerifier: new StubFailClosedVerifier() })).toThrow(/unwired_plug_forbidden_in_production/);
  });
  it("prod refuses mocks; binder slot checked", () => {
    const fake = (name: string) => ({ name }) as any;
    expect(() => assertPlugsProductionReady({ quoteVerifier: mock(N), gpuVerifier: fake("nras-gpu-verifier"), gatewayVerifier: fake("dcap-gateway-verifier") })).toThrow(/quoteVerifier=mock-tests-only/);
    expect(() => assertPlugsProductionReady({ quoteVerifier: fake("dcap-quote-verifier"), gpuVerifier: fake("nras-gpu-verifier"), gatewayVerifier: fake("dcap-gateway-verifier"),
      responseBinder: new StubFailClosedResponseBinder() })).toThrow(/responseBinder/);
    expect(() => assertPlugsProductionReady({ quoteVerifier: fake("dcap-quote-verifier"), gpuVerifier: fake("nras-gpu-verifier"), gatewayVerifier: fake("dcap-gateway-verifier") }, { requireBinder: true })).toThrow(/responseBinder=default-stub/);
    expect(() => assertPlugsProductionReady({ quoteVerifier: fake("dcap-quote-verifier"), gpuVerifier: fake("nras-gpu-verifier"), gatewayVerifier: fake("dcap-gateway-verifier"), responseBinder: fake("noble-response-binder") }, { requireBinder: true })).not.toThrow();
  });
  it("non-prod default stays StubFailClosed (constructs)", () => {
    expect(() => new AttestationClient({ env: {} })).not.toThrow();
  });
  it("assertBoundCompletion refuses stub/default binder under NODE_ENV=production", async () => {
    const prev = process.env.NODE_ENV; process.env.NODE_ENV = "production";
    try { await expect(assertBoundCompletion([], {} as any)).rejects.toMatchObject({ reason: "unwired_plug_forbidden_in_production" }); }
    finally { process.env.NODE_ENV = prev; }
  });
});
