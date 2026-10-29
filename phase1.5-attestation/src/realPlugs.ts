import { createRequire } from "node:module";
import type { ModelAttestation, QuoteResult } from "./types.js";
import type { QuoteVerifier, GpuVerifier, GatewayVerifier } from "./quoteVerifier.js";
import { expectedReportData } from "./verify.js";
import { createHash, createPublicKey, verify as cryptoVerify, X509Certificate } from "node:crypto";

const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
const nhex = (s: string) => s.toLowerCase().replace(/^0x/, "");

/** Minimal shape of @phala/dcap-qvl VerifiedReport we consume. */
export interface DcapVerifiedReport {
  status: string; advisory_ids: string[];
  report: { type: string; data: any; asTd10?: () => any };
}
export type GetCollateralAndVerify = (raw: Uint8Array, pccsUrl?: string) => Promise<DcapVerifiedReport>;

/** Load dcap-qvl lazily; returns null if the package is missing (⇒ DENY). */
export function loadDcapQvl(): GetCollateralAndVerify | null {
  try { const m = createRequire(import.meta.url)("@phala/dcap-qvl"); return typeof m.getCollateralAndVerify === "function" ? m.getCollateralAndVerify : null; }
  catch { return null; }
}

/** Extract TD10 body from any TDX report variant (td10 / td15 / td15ex). */
function td10Of(report: DcapVerifiedReport["report"]): any | null {
  if (!report || report.type === "sgx") return null;
  let d = report.data; while (d && d.base) d = d.base;
  return d && d.reportData && d.tdAttributes ? d : null;
}

/**
 * Real Intel DCAP / TDX verifier (PRE_PHASE2_ACCEPTANCE.md §A): @phala/dcap-qvl getCollateralAndVerify
 * (Phala PCCS default; set pccsUrl = INTEL_PCS_URL / env NEAR_ATTEST_PCCS_URL to use Intel PCS).
 * Rejects SGX quotes and TDX debug (td_attributes bit0). Any collateral/network/parse error ⇒ DENY.
 * TCB/advisory policy is enforced by verify.ts (interim UpToDate + empty advisory allowlist).
 */
export class DcapQuoteVerifier implements QuoteVerifier {
  readonly name = "dcap-quote-verifier";
  private readonly impl: GetCollateralAndVerify | null;
  constructor(private readonly opts: { pccsUrl?: string; getCollateralAndVerify?: GetCollateralAndVerify } = {}) {
    this.impl = opts.getCollateralAndVerify ?? loadDcapQvl();
  }
  async verifyQuote(intelQuoteHex: string): Promise<QuoteResult> {
    if (!this.impl) return { ok: false, reason: "dcap_qvl_unavailable" };
    const h = typeof intelQuoteHex === "string" ? nhex(intelQuoteHex) : "";
    if (!h || h.length % 2 || !/^[0-9a-f]+$/.test(h)) return { ok: false, reason: "quote_hex_invalid" };
    let r: DcapVerifiedReport;
    try { r = await this.impl(Buffer.from(h, "hex"), this.opts.pccsUrl ?? process.env.NEAR_ATTEST_PCCS_URL); }
    catch { return { ok: false, reason: "dcap_verify_failed" }; }
    const td = r && td10Of(r.report);
    if (!td) return { ok: false, reason: "not_tdx_quote" };
    if (!td.tdAttributes?.length || (td.tdAttributes[0] & 0x01) !== 0) return { ok: false, reason: "tdx_debug_rejected" };
    if (typeof r.status !== "string") return { ok: false, reason: "tcb_status_missing" };
    return { ok: true, tcbStatus: r.status, advisoryIds: [...(r.advisory_ids ?? [])], reportData: hex(td.reportData),
      rtmr0: hex(td.rtMr0), rtmr1: hex(td.rtMr1), rtmr2: hex(td.rtMr2), rtmr3: hex(td.rtMr3),
      mrConfigId: hex(td.mrConfigId), mrTd: hex(td.mrTd) };
  }
}

/**
 * Real gateway_attestation verifier: reuses QuoteVerifier on gateway intel_quote, enforces TCB UpToDate + no advisories,
 * request_nonce echo, and report_data = bound(signing_address) ‖ nonce. Success NEVER authorizes model trust (verify.ts).
 */
export class DcapGatewayVerifier implements GatewayVerifier {
  readonly name = "dcap-gateway-verifier";
  constructor(readonly quoteVerifier: QuoteVerifier = new DcapQuoteVerifier(),
    private readonly policy: { allowedTcbStatuses: string[]; allowedAdvisoryIds: string[] } = { allowedTcbStatuses: ["UpToDate"], allowedAdvisoryIds: [] }) {}
  async verifyGateway(g0: ModelAttestation | Record<string, unknown>, nonce: string) {
    const g = g0 as Record<string, unknown>;
    if (!g || typeof g.intel_quote !== "string" || typeof g.signing_address !== "string") return { ok: false, reason: "gateway_evidence_missing" };
    if (typeof g.request_nonce !== "string" || nhex(g.request_nonce) !== nhex(nonce)) return { ok: false, reason: "gateway_nonce_mismatch" };
    const q = await this.quoteVerifier.verifyQuote(g.intel_quote);
    if (!q.ok) return { ok: false, reason: `gateway_quote:${q.reason}` };
    if (!this.policy.allowedTcbStatuses.includes(q.tcbStatus)) return { ok: false, reason: "gateway_tcb_policy" };
    if (q.advisoryIds.some((a) => !this.policy.allowedAdvisoryIds.includes(a))) return { ok: false, reason: "gateway_advisories" };
    const algo = g.signing_algo == null ? "ecdsa" : String(g.signing_algo);
    if (algo !== "ecdsa" && algo !== "ed25519") return { ok: false, reason: "gateway_signing_algo_unsupported" };
    let exp: string;
    try { exp = expectedReportData(g.signing_address, nonce, algo); } catch { return { ok: false, reason: "gateway_signing_address_invalid" }; }
    if (nhex(q.reportData) !== exp) return { ok: false, reason: "gateway_report_data_mismatch" };
    return { ok: true, quoteSha256: createHash("sha256").update(Buffer.from(nhex(g.intel_quote), "hex")).digest("hex") };
  }
}

export const NRAS_GPU_URL = "https://nras.attestation.nvidia.com/v3/attest/gpu";
export type NrasFetch = (url: string, init: { method: string; headers: Record<string, string>; body: string }) =>
  Promise<{ ok: boolean; status: number; headers: { get(name: string): string | null }; text(): Promise<string> }>;

export const NRAS_JWKS_URL = "https://nras.attestation.nvidia.com/.well-known/jwks.json";
export type Jwk = { kty: string; crv?: string; kid?: string; x?: string; y?: string; x5c?: string[]; [k: string]: unknown };
/** J3: `force` bypasses the TTL cache (unknown-kid refetch). */
export type JwksFetch = (url: string, opts?: { force?: boolean }) => Promise<{ keys: Jwk[] }>;
export const NRAS_ALLOWED_ALGS = ["ES384"] as const;
export const NRAS_ISSUER = "https://nras.attestation.nvidia.com";

/**
 * J2 pins: sha256(SPKI DER) of the NVIDIA intermediates observed in the LIVE JWKS x5c chains
 * (probed 2026-10-29, 212/212 keys: x5c = [leaf "NVIDIA Attestation Service GPU GH100", intermediate];
 * both intermediates issued by "NVIDIA Attestation Service CA 001"). CA 001 itself is NOT present in x5c,
 * so its SPKI cannot be pinned from JWKS — see EVIDENCE_PRE_PHASE2_J2_J3.md. Widen only with PS approval.
 */
export const NRAS_X5C_PINNED_SPKI_SHA256: Readonly<Record<string, string>> = Object.freeze({
  "fd32837f954e2c45db073105166dfe6985ae0480bb113fba63b091a75affe896": "NVIDIA Attestation Service GPU Intermediate 004 (issuer CA 001, notAfter 2029-12-08)",
  "ba14d00377699189b6762c22c744a9dbdc62aa9396097ada7150426c6ff39afc": "NVIDIA Attestation Service GPU Intermediate 005 (issuer CA 001, notAfter 2030-10-08)",
});

const spkiSha256 = (c: X509Certificate) => createHash("sha256").update(c.publicKey.export({ type: "spki", format: "der" })).digest("hex");

/**
 * J2: require x5c; leaf SPKI must equal JWK x/y; each link signed+issued by the next cert until a cert whose
 * SPKI sha256 is pinned; every cert in the walked path within validity at `nowMs`. Bare coords alone ⇒ deny.
 */
/** Expected NRAS JWKS leaf subject O (live probe 2026-10-29: 212/212 leaves = "C=US, O=NVIDIA Corporation, CN=NVIDIA Attestation Service GPU GH100"). */
export const NRAS_LEAF_ORG = "NVIDIA Corporation";

/** Leaf subject O check: exactly one O RDN equal to `expected`; missing / multiple / wrong ⇒ deny (fail-closed). */
export function checkLeafOrg(c: X509Certificate, expected: string): { ok: true } | { ok: false; reason: string } {
  const orgs = c.subject.split("\n").filter((l) => l.startsWith("O=")).map((l) => l.slice(2));
  if (orgs.length === 0) return { ok: false, reason: "nras_jwks_x5c_leaf_org_missing" };
  if (orgs.length !== 1 || orgs[0] !== expected) return { ok: false, reason: "nras_jwks_x5c_leaf_org_mismatch" };
  return { ok: true };
}

export function verifyJwkX5c(k: Jwk, pins: Readonly<Record<string, string>>, nowMs: number, leafOrg: string = NRAS_LEAF_ORG): { ok: true; pinned: string } | { ok: false; reason: string } {
  if (!Array.isArray(k.x5c) || k.x5c.length < 2 || k.x5c.some((b) => typeof b !== "string" || !b)) return { ok: false, reason: "nras_jwks_x5c_missing" };
  let chain: X509Certificate[];
  try { chain = k.x5c.map((b) => new X509Certificate(Buffer.from(b, "base64"))); } catch { return { ok: false, reason: "nras_jwks_x5c_invalid" }; }
  let lj: any;
  try { lj = chain[0]!.publicKey.export({ format: "jwk" }); } catch { return { ok: false, reason: "nras_jwks_x5c_invalid" }; }
  if (lj.kty !== "EC" || lj.crv !== "P-384" || lj.x !== k.x || lj.y !== k.y) return { ok: false, reason: "nras_jwks_x5c_leaf_mismatch" };
  const org = checkLeafOrg(chain[0]!, leafOrg); if (!org.ok) return org;
  const valid = (c: X509Certificate) => Date.parse(c.validFrom) <= nowMs && nowMs <= Date.parse(c.validTo);
  for (let i = 0; i < chain.length; i++) {
    const c = chain[i]!;
    if (!valid(c)) return { ok: false, reason: "nras_jwks_x5c_expired" };
    if (i > 0 && pins[spkiSha256(c)]) return { ok: true, pinned: spkiSha256(c) };
    const issuer = chain[i + 1];
    if (!issuer) break;
    try { if (!c.checkIssued(issuer) || !c.verify(issuer.publicKey)) return { ok: false, reason: "nras_jwks_x5c_chain_broken" }; }
    catch { return { ok: false, reason: "nras_jwks_x5c_chain_broken" }; }
  }
  return { ok: false, reason: "nras_jwks_x5c_unpinned" };
}

/** Default JWKS fetch with TTL cache (10m). `force` (J3) bypasses and refreshes the cache. Any failure throws ⇒ DENY. */
export function cachedJwksFetch(inner?: JwksFetch, ttlMs = 10 * 60_000, now = () => Date.now()): JwksFetch {
  const cache = new Map<string, { at: number; jwks: { keys: Jwk[] } }>();
  const base: JwksFetch = inner ?? (async (url) => {
    const r = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
    if (!r.ok) throw new Error(`jwks_http_${r.status}`);
    return (await r.json()) as { keys: Jwk[] };
  });
  return async (url, o) => {
    const c = cache.get(url); if (!o?.force && c && now() - c.at < ttlMs) return c.jwks;
    const jwks = await base(url, o); cache.set(url, { at: now(), jwks }); return jwks;
  };
}

export interface NrasJwtOpts {
  jwksFetch: JwksFetch; jwksUrl?: string; now?: () => number;
  /** J2 SPKI pin set (sha256 hex → label). Default = NVIDIA live intermediates. Injectable for tests only. */
  x5cPins?: Readonly<Record<string, string>>;
  /** Expected leaf subject O. Default NRAS_LEAF_ORG. Injectable for tests only. */
  leafOrg?: string;
}

/**
 * J1+J2+J3: verify NRAS EAT JWT (ES384 / P-384) against NVIDIA JWKS BEFORE trusting claims.
 * Unknown kid ⇒ exactly one forced cache-bust refetch, then deny. JWK must carry pinned x5c chain (J2).
 * Requires exp, honors nbf, requires iss === NRAS_ISSUER (missing ⇒ deny, fail-closed).
 */
export async function verifyNrasJwt(jwt: string, opts: NrasJwtOpts):
  Promise<{ ok: true; claims: any } | { ok: false; reason: string }> {
  const parts = jwt.split(".");
  if (parts.length !== 3 || parts.some((x) => !x)) return { ok: false, reason: "nras_jwt_malformed" };
  let hdr: any, claims: any;
  try { hdr = JSON.parse(Buffer.from(parts[0]!, "base64url").toString("utf8")); claims = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")); }
  catch { return { ok: false, reason: "nras_jwt_malformed" }; }
  if (!hdr || !(NRAS_ALLOWED_ALGS as readonly string[]).includes(hdr.alg)) return { ok: false, reason: "nras_jwt_alg_rejected" };
  if (typeof hdr.kid !== "string" || !hdr.kid) return { ok: false, reason: "nras_jwt_kid_missing" };
  const url = opts.jwksUrl ?? NRAS_JWKS_URL;
  const lookup = async (force: boolean): Promise<Jwk[] | string> => {
    let jwks: { keys: Jwk[] };
    try { jwks = await opts.jwksFetch(url, force ? { force: true } : undefined); } catch { return "nras_jwks_unavailable"; }
    if (!jwks || !Array.isArray(jwks.keys) || jwks.keys.length === 0) return "nras_jwks_unavailable";
    return jwks.keys.filter((k) => k && k.kid === hdr.kid);
  };
  let matches = await lookup(false);
  if (typeof matches === "string") return { ok: false, reason: matches };
  if (matches.length === 0) { // J3: one forced refetch (cap 1 per verify)
    matches = await lookup(true);
    if (typeof matches === "string") return { ok: false, reason: matches };
  }
  if (matches.length !== 1) return { ok: false, reason: "nras_jwks_kid_not_found" };
  const k = matches[0]!;
  if (k.kty !== "EC" || k.crv !== "P-384" || typeof k.x !== "string" || typeof k.y !== "string") return { ok: false, reason: "nras_jwks_key_invalid" };
  const nowMs = (opts.now ?? Date.now)();
  const x = verifyJwkX5c(k, opts.x5cPins ?? NRAS_X5C_PINNED_SPKI_SHA256, nowMs, opts.leafOrg ?? NRAS_LEAF_ORG);
  if (!x.ok) return x;
  let ok = false;
  try {
    const key = createPublicKey({ key: { kty: "EC", crv: "P-384", x: k.x, y: k.y }, format: "jwk" });
    const sig = Buffer.from(parts[2]!, "base64url");
    if (sig.length !== 96) return { ok: false, reason: "nras_jwt_bad_signature" };
    ok = cryptoVerify("sha384", Buffer.from(`${parts[0]}.${parts[1]}`), { key, dsaEncoding: "ieee-p1363" }, sig);
  } catch { return { ok: false, reason: "nras_jwks_key_invalid" }; }
  if (!ok) return { ok: false, reason: "nras_jwt_bad_signature" };
  const nowS = Math.floor(nowMs / 1000);
  if (!claims || typeof claims.exp !== "number") return { ok: false, reason: "nras_jwt_exp_missing" };
  if (claims.exp <= nowS) return { ok: false, reason: "nras_jwt_expired" };
  if (claims.nbf !== undefined && (typeof claims.nbf !== "number" || claims.nbf > nowS + 60)) return { ok: false, reason: "nras_jwt_not_yet_valid" };
  if (claims.iss !== NRAS_ISSUER) return { ok: false, reason: claims.iss === undefined ? "nras_jwt_iss_missing" : "nras_jwt_iss_mismatch" };
  return { ok: true, claims };
}

/**
 * NRAS body: JSON array whose first entry is ["JWT", "<jwt>"]. Signature verified via NVIDIA JWKS (J1) first;
 * then pass iff claim `x-nvidia-overall-att-result === true` (boolean). Missing/malformed ⇒ deny. Header is ignored.
 */
export async function nrasBodyOverallResult(body: string, opts: NrasJwtOpts): Promise<{ ok: boolean; reason?: string }> {
  let arr: unknown; try { arr = JSON.parse(body); } catch { return { ok: false, reason: "nras_body_not_json" }; }
  const first = Array.isArray(arr) ? arr[0] : undefined;
  if (!Array.isArray(first) || first[0] !== "JWT" || typeof first[1] !== "string") return { ok: false, reason: "nras_jwt_missing" };
  const v = await verifyNrasJwt(first[1], opts);
  if (!v.ok) return v;
  return v.claims["x-nvidia-overall-att-result"] === true ? { ok: true } : { ok: false, reason: "nras_overall_result_false" };
}

/**
 * Real NVIDIA GPU verifier: nvidia_payload MUST be an exact string → JSON → nonce match → POST NRAS /v3/attest/gpu
 * (body = payload string as received) → JWKS-verified body JWT claim (R1 + J1). Network/HTTP/JWKS errors ⇒ DENY.
 * Called only when evidence is present (require_gpu=false ⇒ verify-if-present). fetch / jwksFetch injectable for tests.
 */
export class NrasGpuVerifier implements GpuVerifier {
  readonly name = "nras-gpu-verifier";
  private readonly jwksFetch: JwksFetch;
  constructor(private readonly opts: { fetch?: NrasFetch; url?: string; jwksFetch?: JwksFetch; jwksUrl?: string; now?: () => number; x5cPins?: Readonly<Record<string, string>>; leafOrg?: string } = {}) {
    this.jwksFetch = cachedJwksFetch(opts.jwksFetch);
  }
  async verifyGpu(payload: unknown, nonce: string) {
    if (typeof payload !== "string" || !payload) return { ok: false, reason: "nvidia_payload_not_string" };
    let p: any; try { p = JSON.parse(payload); } catch { return { ok: false, reason: "nvidia_payload_not_json" }; }
    if (!p || typeof p.nonce !== "string" || nhex(p.nonce) !== nhex(nonce)) return { ok: false, reason: "nvidia_nonce_mismatch" };
    if (!Array.isArray(p.evidence_list) || p.evidence_list.length === 0) return { ok: false, reason: "nvidia_evidence_empty" };
    const f = this.opts.fetch ?? (globalThis.fetch as unknown as NrasFetch | undefined);
    if (!f) return { ok: false, reason: "nras_fetch_unavailable" };
    try {
      const res = await f(this.opts.url ?? NRAS_GPU_URL, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: payload });
      if (!res.ok) return { ok: false, reason: `nras_http_${res.status}` };
      // R1: acceptance = body JWT claim (NEAR docs), NOT the response header.
      const text = await res.text();
      return await nrasBodyOverallResult(text, { jwksFetch: this.jwksFetch, jwksUrl: this.opts.jwksUrl, now: this.opts.now, x5cPins: this.opts.x5cPins, leafOrg: this.opts.leafOrg });
    } catch { return { ok: false, reason: "nras_network_error" }; }
  }
}
