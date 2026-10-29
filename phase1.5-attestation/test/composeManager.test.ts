import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os"; import { join } from "node:path";
import { verifyComposeManager, summarizeComposeManager, expectedComposeManagerReportData, verifyReport, DEFAULT_POLICY, DigestLogger,
  MockGatewayVerifier, expectedMrConfigId, expectedReportData, replayRtmr, loadAllowlist, type QuoteVerifier, type QuoteResult } from "../src/index.js";

const N = "a".repeat(64), AH = "c".repeat(64), CMQ = "cafe";
const pol = { allowedTcbStatuses: ["UpToDate"], allowedAdvisoryIds: [] as string[] };
const ok = (reportData: string, o: Partial<QuoteResult> = {}): QuoteResult =>
  ({ ok: true, tcbStatus: "UpToDate", advisoryIds: [], reportData, rtmr3: "00".repeat(48), mrConfigId: "00".repeat(48), ...o } as QuoteResult);
const qvOf = (r: QuoteResult): QuoteVerifier => ({ name: "dcap-quote-verifier", verifyQuote: async () => r } as any);
const cm = (o: Record<string, unknown> = {}) => ({ quote: CMQ, nonce: N, nonce_source: "client", actions_hash: AH, report_data: AH + N,
  actions: [{ action: "compose_manager_started", image: "nearaidev/compose-manager@sha256:" + "1".repeat(64) },
    { action: "compose_up", file: "prod/a.yaml", file_sha256: "d".repeat(64), tag: "v1", commit: "e".repeat(40) }],
  vm_config: JSON.stringify({ image: "dstack-nvidia-0.5.12" }), ...o });

describe("G1 compose_manager_attestation", () => {
  it("layout = actions_hash(32) ‖ nonce(32)", () => {
    expect(expectedComposeManagerReportData(AH, N)).toBe(AH + N);
    expect(() => expectedComposeManagerReportData("cc", N)).toThrow();
  });
  it("passes and summarizes (record-only)", async () => {
    const s = await verifyComposeManager(cm(), N, qvOf(ok(AH + N)), pol);
    expect(s.latestComposeUp?.file_sha256).toBe("d".repeat(64));
    expect(s.composeManagerImages).toHaveLength(1); expect(s.vmConfigImage).toBe("dstack-nvidia-0.5.12");
  });
  const deny = async (c: unknown, q: QuoteResult, nonce = N) =>
    expect(verifyComposeManager(c, nonce, qvOf(q), pol)).rejects.toMatchObject({ check: "compose_manager" });
  it("quote report_data mismatch ⇒ DENY", () => deny(cm(), ok("b".repeat(64) + N)));
  it("stale/foreign nonce ⇒ DENY", () => deny(cm({ nonce: "b".repeat(64), report_data: AH + "b".repeat(64) }), ok(AH + "b".repeat(64))));
  it("nonce_source != client ⇒ DENY", () => deny(cm({ nonce_source: "server" }), ok(AH + N)));
  it("echoed report_data disagrees ⇒ DENY", () => deny(cm({ report_data: AH + "f".repeat(64) }), ok(AH + N)));
  it("quote failure / debug ⇒ DENY", () => deny(cm(), { ok: false, reason: "tdx_debug_rejected" }));
  it("TCB not UpToDate ⇒ DENY", () => deny(cm(), ok(AH + N, { tcbStatus: "OutOfDate" })));
  it("advisories ⇒ DENY", () => deny(cm(), ok(AH + N, { advisoryIds: ["INTEL-SA-1"] })));
  it("malformed / missing quote / bad actions_hash ⇒ DENY", async () => {
    await deny("x", ok(AH + N)); await deny(cm({ quote: undefined }), ok(AH + N));
    await deny(cm({ actions_hash: "zz", report_data: undefined }), ok(AH + N)); await deny(cm({ actions: undefined }), ok(AH + N));
  });

  // verifyReport wiring: model passes, CM present+fail ⇒ DENY compose_manager; absent ⇒ unaffected.
  const ADDR = "0x" + "ab".repeat(20), COMPOSE = '{"services":{}}';
  const EV = [{ imr: 3, event_type: 134217729, event: "compose-hash", event_payload: "33".repeat(32) }];
  const { composeSha256, mrConfigId } = expectedMrConfigId(COMPOSE); const RT = replayRtmr(EV);
  const dir = mkdtempSync(join(tmpdir(), "cm-")); const AL = join(dir, "m.json");
  writeFileSync(AL, JSON.stringify({ entries: [{ model_id: "m", mrconfigid: mrConfigId, app_compose_sha256: composeSha256, rtmr3: RT,
    effective_from: "2026-01-01T00:00:00Z", notes: "t", privacy_security_approver: "test-fixture-not-approved", test_only: true }] }));
  const allowlist = loadAllowlist(AL, { allowTestOnly: true, env: {} });
  const routed = (cmRd: string): QuoteVerifier => ({ name: "dcap-quote-verifier", verifyQuote: async (q: string) =>
    q === CMQ ? ok(cmRd) : ok(expectedReportData(ADDR, N), { rtmr3: RT, mrConfigId }) } as any);
  const rep = (extra: Record<string, unknown>) => ({ gateway_attestation: { request_nonce: N }, model_attestations: [{ signing_address: ADDR,
    intel_quote: "deadbeef", event_log: EV, info: { app_compose: COMPOSE }, request_nonce: N, ...extra }] }) as any;
  const deps = (qv: QuoteVerifier) => ({ quoteVerifier: qv, gpuVerifier: qv as any, gatewayVerifier: new MockGatewayVerifier(true, { iUnderstandThisIsTestOnly: true }),
    policy: DEFAULT_POLICY, allowlist, logger: new DigestLogger(() => {}) });
  it("verifyReport: CM present+ok passes and records quote sha", async () => {
    const [v] = await verifyReport(rep({ compose_manager_attestation: cm() }), "m", N, deps(routed(AH + N)));
    expect(v!.composeManagerQuoteSha256).toMatch(/^[0-9a-f]{64}$/);
  });
  it("verifyReport: CM present+fail ⇒ DENY", async () => {
    await expect(verifyReport(rep({ compose_manager_attestation: cm() }), "m", N, deps(routed("0".repeat(128)))))
      .rejects.toMatchObject({ check: "compose_manager" });
    await expect(verifyReport(rep({ compose_manager_attestation: {} }), "m", N, deps(routed(AH + N)))).rejects.toMatchObject({ check: "compose_manager" });
  });
  it("G4 verifyReport: CM absent ⇒ DENY compose_manager_missing", async () => {
    await expect(verifyReport(rep({}), "m", N, deps(routed(AH + N)))).rejects.toMatchObject({ check: "compose_manager", message: expect.stringContaining("compose_manager_missing") });
    await expect(verifyReport(rep({ compose_manager_attestation: null }), "m", N, deps(routed(AH + N)))).rejects.toMatchObject({ check: "compose_manager" });
  });

  // Recorded genuine fixtures (raw is gitignored; skipped when absent). Quote path mocked to the recorded report_data;
  // live DCAP on the real CM quote is exercised by scripts/verifyRecorded.ts.
  for (const slug of ["deepseek_ai_DeepSeek_V4_1_Flash_1017", "deepseek_ai_DeepSeek_V4_1_Flash_1017_capture2"]) {
    const R = `fixtures/recorded/raw/${slug}`;
    it.skipIf(!existsSync(`${R}.report.raw.json`))(`recorded ${slug}: CM binding layout holds`, async () => {
      const r = JSON.parse(readFileSync(`${R}.report.raw.json`, "utf8")); const n = readFileSync(`${R}.nonce.txt`, "utf8").trim();
      const c = r.model_attestations[0].compose_manager_attestation;
      const s = await verifyComposeManager(c, n, qvOf(ok(c.actions_hash + n)), pol);
      expect(s.latestComposeUp?.file).toBeTruthy();
      expect(summarizeComposeManager(c).actionsCount).toBe(c.actions.length);
      await expect(verifyComposeManager(c, "b".repeat(64), qvOf(ok(c.actions_hash + n)), pol)).rejects.toMatchObject({ check: "compose_manager" });
    });
  }
});
