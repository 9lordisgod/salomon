import { describe, it, expect } from "vitest";
import { verifyReport, DEFAULT_POLICY, DigestLogger, MockGatewayVerifier, expectedMrConfigId, expectedReportData, replayRtmr,
  parseAllowlist, latestComposeUpFileSha256, type QuoteVerifier, type QuoteResult } from "../src/index.js";

// SECURITY_ACCEPTANCE_COMPOSE_FILE_SHA256.md — pin value used for docs/tests only (measurements.json untouched).
const GLM_PIN = "904054f502ccdb2f913d6b80f156ea658b8bc5cb6f8af06082723581d62a45c0";
const OTHER = "d".repeat(64);
const N = "a".repeat(64), AH = "c".repeat(64), CMQ = "cafe", ADDR = "0x" + "ab".repeat(20), COMPOSE = '{"services":{}}';
const EV = [{ imr: 3, event_type: 134217729, event: "compose-hash", event_payload: "33".repeat(32) }];
const { composeSha256, mrConfigId } = expectedMrConfigId(COMPOSE); const RT = replayRtmr(EV);
const ok = (reportData: string, o: Partial<QuoteResult> = {}): QuoteResult =>
  ({ ok: true, tcbStatus: "UpToDate", advisoryIds: [], reportData, rtmr3: "00".repeat(48), mrConfigId: "00".repeat(48), ...o } as QuoteResult);
const qv = (cmRd = AH + N): QuoteVerifier => ({ name: "dcap-quote-verifier", verifyQuote: async (q: string) =>
  q === CMQ ? ok(cmRd) : ok(expectedReportData(ADDR, N), { rtmr3: RT, mrConfigId }) } as any);
const up = (h: string | undefined, ts: string | undefined) => ({ action: "compose_up", file: "prod/x.yaml", file_sha256: h, timestamp: ts, services: ["otel"] });
const cm = (actions: unknown[]) => ({ quote: CMQ, nonce: N, nonce_source: "client", actions_hash: AH, report_data: AH + N, actions });
const rep = (cmAtt: unknown) => ({ gateway_attestation: { request_nonce: N }, model_attestations: [{ signing_address: ADDR, intel_quote: "deadbeef",
  event_log: EV, info: { app_compose: COMPOSE }, request_nonce: N, ...(cmAtt === undefined ? {} : { compose_manager_attestation: cmAtt }) }] }) as any;
const entry = (o: Record<string, unknown> = {}) => ({ model_id: "m", mrconfigid: mrConfigId, app_compose_sha256: composeSha256, rtmr3: RT,
  effective_from: "2026-01-01T00:00:00Z", notes: "t", privacy_security_approver: "test-fixture-not-approved", test_only: true, ...o });
const al = (...es: unknown[]) => parseAllowlist({ entries: es }, { allowTestOnly: true, env: {} });
const deps = (allowlist: any, q = qv()) => ({ quoteVerifier: q, gpuVerifier: q as any, gatewayVerifier: new MockGatewayVerifier(true, { iUnderstandThisIsTestOnly: true }),
  policy: DEFAULT_POLICY, allowlist, logger: new DigestLogger(() => {}) });
const T1 = "2026-10-01T00:00:00Z", T2 = "2026-10-02T00:00:00Z";

describe("compose_file_sha256 schema", () => {
  it("accepts 64-hex, normalizes 0x/uppercase", () => {
    expect(al(entry({ compose_file_sha256: "0x" + GLM_PIN.toUpperCase() }))[0].compose_file_sha256).toBe(GLM_PIN);
  });
  it("absent / empty ⇒ unset", () => {
    expect(al(entry())[0].compose_file_sha256).toBeUndefined();
    expect(al(entry({ compose_file_sha256: "" }))[0].compose_file_sha256).toBeUndefined();
  });
  it("malformed hex ⇒ allowlist_load DENY", () => {
    for (const bad of ["zz".repeat(32), "ab".repeat(31), "ab".repeat(33), 123, true])
      expect(() => al(entry({ compose_file_sha256: bad }))).toThrow(expect.objectContaining({ check: "allowlist_load" }));
  });
});

describe("latest compose_up selection", () => {
  it("max timestamp wins regardless of order; ineligible ignored", () => {
    expect(latestComposeUpFileSha256([up(GLM_PIN, T2), up(OTHER, T1)])).toBe(GLM_PIN);
    expect(latestComposeUpFileSha256([up(OTHER, T1), up(GLM_PIN, T2), up("", "2026-12-01T00:00:00Z"), up(OTHER, "not-a-date"),
      up(OTHER, undefined), { action: "compose_down", file_sha256: OTHER, timestamp: "2027-01-01T00:00:00Z" }])).toBe(GLM_PIN);
    expect(latestComposeUpFileSha256([up("", T1), up(OTHER, "bad")])).toBeUndefined();
  });
});

describe("compose_file_sha256 verify wiring", () => {
  it("pin match ⇒ PASS + records observed digest", async () => {
    const [v] = await verifyReport(rep(cm([up(OTHER, T1), up(GLM_PIN, T2)])), "m", N, deps(al(entry({ compose_file_sha256: GLM_PIN }))));
    expect(v!.composeFileSha256).toBe(GLM_PIN);
  });
  it("pin mismatch (latest differs, older matches) ⇒ DENY compose_file_sha256_mismatch", async () => {
    await expect(verifyReport(rep(cm([up(GLM_PIN, T1), up(OTHER, T2)])), "m", N, deps(al(entry({ compose_file_sha256: GLM_PIN })))))
      .rejects.toMatchObject({ check: "compose_manager", message: expect.stringContaining("compose_file_sha256_mismatch") });
  });
  it("pinned + no eligible compose_up ⇒ DENY compose_file_sha256_missing_up", async () => {
    for (const acts of [[], [up(GLM_PIN, undefined)], [up("", T1)], [{ action: "compose_manager_started" }]])
      await expect(verifyReport(rep(cm(acts)), "m", N, deps(al(entry({ compose_file_sha256: GLM_PIN })))))
        .rejects.toMatchObject({ check: "compose_manager", message: expect.stringContaining("compose_file_sha256_missing_up") });
  });
  it("two matched entries: each pin checked against same observation", async () => {
    const [v] = await verifyReport(rep(cm([up(GLM_PIN, T1)])), "m", N,
      deps(al(entry({ compose_file_sha256: GLM_PIN }), entry({ compose_file_sha256: GLM_PIN, notes: "t2" }))));
    expect(v!.composeFileSha256).toBe(GLM_PIN);
    await expect(verifyReport(rep(cm([up(GLM_PIN, T1)])), "m", N,
      deps(al(entry({ compose_file_sha256: GLM_PIN }), entry({ compose_file_sha256: OTHER })))))
      .rejects.toMatchObject({ message: expect.stringContaining("compose_file_sha256_mismatch") });
  });
  it("omitted pin ⇒ unchanged behavior (no compose_up needed, nothing recorded)", async () => {
    const [v] = await verifyReport(rep(cm([])), "m", N, deps(al(entry())));
    expect(v!.composeFileSha256).toBeUndefined();
  });
  it("CM absent still DENY compose_manager_missing first even when pinned", async () => {
    await expect(verifyReport(rep(undefined), "m", N, deps(al(entry({ compose_file_sha256: GLM_PIN })))))
      .rejects.toMatchObject({ check: "compose_manager", message: expect.stringContaining("compose_manager_missing") });
  });
  it("CM quote fail ⇒ DENY before pin evaluated (not a pin reason)", async () => {
    const p = verifyReport(rep(cm([up(GLM_PIN, T1)])), "m", N, deps(al(entry({ compose_file_sha256: GLM_PIN })), qv("0".repeat(128))));
    await expect(p).rejects.toMatchObject({ check: "compose_manager" });
    await expect(p).rejects.not.toMatchObject({ message: expect.stringContaining("compose_file_sha256") });
  });
});
