import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AttestationClient, AttestationError, DigestLogger, MockQuoteVerifier, MockGatewayVerifier, StubFailClosedVerifier,
  expectedMrConfigId, expectedReportData, replayRtmr, verifyReport, loadAllowlist, nonceHash, DEFAULT_POLICY,
  type MeasurementPolicy, type DigestLogRecord, type AllowlistEntry,
} from "../src/index.js";

const ADDR = "0x" + "ab".repeat(20);
const COMPOSE = '{"services":{"vllm":{}}}';
const EVENTS = [{ imr: 3, digest: "11".repeat(48) }, { imr: 0, digest: "22".repeat(48) }, { imr: 3, digest: "33".repeat(48) }];
const { composeSha256, mrConfigId } = expectedMrConfigId(COMPOSE);
const RTMR3 = replayRtmr(EVENTS);
const MODEL = "deepseek-ai/DeepSeek-V3.1";
const policy: MeasurementPolicy = { ...DEFAULT_POLICY };
const TEST_ENTRY: AllowlistEntry = { model_id: MODEL, mrconfigid: mrConfigId, app_compose_sha256: composeSha256, rtmr3: RTMR3,
  event_log_digests: ["11".repeat(48), "33".repeat(48)], effective_from: "2026-01-01T00:00:00Z", notes: "unit-test fixture",
  privacy_security_approver: "test-fixture-not-approved", test_only: true };
const dir = mkdtempSync(join(tmpdir(), "attest-"));
const TEST_AL = join(dir, "measurements.json");
writeFileSync(TEST_AL, JSON.stringify({ entries: [TEST_ENTRY] }));
const EMPTY_AL = join(dir, "empty.json");
writeFileSync(EMPTY_AL, JSON.stringify({ entries: [] }));
const allowlist = loadAllowlist(TEST_AL, { allowTestOnly: true, env: {} });

const mkAtt = (nonce: string, over: Record<string, unknown> = {}) => ({ signing_address: ADDR, intel_quote: "deadbeef",
  event_log: EVENTS, info: { app_compose: COMPOSE }, request_nonce: nonce, ...over });
const mkReport = (nonce: string, atts: unknown[] = [mkAtt(nonce)], gw: unknown = { request_nonce: nonce }) =>
  ({ gateway_attestation: gw, model_attestations: atts }) as any;
const mock = (nonce: string, over: Record<string, unknown> = {}, gpuOk = true) => new MockQuoteVerifier({ tcbStatus: "UpToDate", advisoryIds: [],
  reportData: expectedReportData(ADDR, nonce), rtmr3: RTMR3, mrConfigId, ...over } as any, { iUnderstandThisIsTestOnly: true, gpuOk });
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
    expect(() => loadAllowlist("allowlist/measurements.json")).toThrow(/empty/); // repo file ships empty
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

  it("default client (empty repo allowlist + stub verifiers) denies and never becomes ready", async () => {
    const lines: string[] = [];
    const c = new AttestationClient({ env, fetchImpl: fetchFor((n) => mkReport(n)), logger: mkLogger(lines) });
    await expect(c.verifyForModel(MODEL)).rejects.toMatchObject({ check: "allowlist_load" });
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
    const lazy = { name: "lazy", verifyQuote: () => qv!.verifyQuote(), verifyGpu: () => qv!.verifyGpu() };
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
