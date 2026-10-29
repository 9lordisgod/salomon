import type { ModelAttestation, QuoteResult, VerifiedQuote } from "./types.js";

/** Plug point for Intel DCAP verification (production: dcap-qvl, with collateral + TCB eval). */
export interface QuoteVerifier {
  readonly name: string;
  verifyQuote(intelQuoteHex: string): Promise<QuoteResult>;
}
/** Plug point for NVIDIA GPU attestation (production: NVIDIA NRAS / local verifier). */
export interface GpuVerifier {
  readonly name: string;
  verifyGpu(nvidiaPayload: unknown, nonce: string): Promise<{ ok: boolean; reason?: string }>;
}
/** Plug point for NEAR gateway_attestation (mandatory on gateway path; never sufficient alone). */
export interface GatewayVerifier {
  readonly name: string;
  verifyGateway(gateway: ModelAttestation | Record<string, unknown>, nonce: string): Promise<{ ok: boolean; reason?: string; quoteSha256?: string }>;
}

/** Default for all plugs. ALWAYS denies. */
export class StubFailClosedVerifier implements QuoteVerifier, GpuVerifier, GatewayVerifier {
  readonly name = "stub-fail-closed";
  async verifyQuote(): Promise<QuoteResult> { return { ok: false, reason: "quote_verifier_not_configured" }; }
  async verifyGpu() { return { ok: false, reason: "gpu_verifier_not_configured" }; }
  async verifyGateway() { return { ok: false, reason: "gateway_verifier_not_configured" }; }
}

function assertTestOnly(opts: { iUnderstandThisIsTestOnly: true } | undefined) {
  if (opts?.iUnderstandThisIsTestOnly !== true) throw new Error("mock verifier requires explicit test-only opt-in");
  if (process.env.NODE_ENV === "production") throw new Error("mock verifier forbidden in production");
}

/** TESTS ONLY. Returns caller-supplied quote fields; no cryptography. */
export class MockQuoteVerifier implements QuoteVerifier, GpuVerifier {
  readonly name = "mock-tests-only";
  private readonly gpuOk: boolean;
  constructor(private readonly fields: Omit<VerifiedQuote, "ok"> | null, opts: { iUnderstandThisIsTestOnly: true; gpuOk?: boolean }) {
    assertTestOnly(opts);
    this.gpuOk = opts.gpuOk ?? false;
  }
  async verifyQuote(): Promise<QuoteResult> {
    return this.fields ? { ok: true, ...this.fields } : { ok: false, reason: "mock_deny" };
  }
  async verifyGpu() { return this.gpuOk ? { ok: true } : { ok: false, reason: "mock_gpu_deny" }; }
}

/** TESTS ONLY. Gateway mock: passes iff `ok` and request_nonce echoes nonce. */
export class MockGatewayVerifier implements GatewayVerifier {
  readonly name = "mock-gateway-tests-only";
  constructor(private readonly ok: boolean, opts: { iUnderstandThisIsTestOnly: true }) { assertTestOnly(opts); }
  async verifyGateway(g: Record<string, unknown>, nonce: string) {
    if (!this.ok) return { ok: false, reason: "mock_gateway_deny" };
    if (g.request_nonce !== nonce) return { ok: false, reason: "gateway nonce mismatch" };
    return { ok: true };
  }
}
