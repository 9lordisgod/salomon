import { AttestationError } from "./types.js";
import type { GatewayVerifier, GpuVerifier, QuoteVerifier } from "./quoteVerifier.js";
import type { ResponseSignatureBinder } from "./responseBinding.js";

/**
 * Plug names that are stubs / mocks / not-yet-wired. Forbidden when production plugs are required
 * (NODE_ENV=production or requireProductionPlugs=true). Remove a name ONLY when the real plug is wired + PS-signed.
 */
export const UNWIRED_PLUG_NAMES: ReadonlySet<string> = new Set([
  "stub-fail-closed", "mock-tests-only", "mock-gateway-tests-only",
  "dcap-quote-verifier-stub", "dcap-gateway-verifier-stub", "nras-gpu-verifier-stub", // legacy stub names (pre-wiring)
  "stub-fail-closed-response-binder",
]);

/** R2: ALLOWLIST. Only these names pass assertPlugsProductionReady; everything else (incl. arbitrary names) throws. */
export const WIRED_PLUG_NAMES: ReadonlySet<string> = new Set(["dcap-quote-verifier", "dcap-gateway-verifier", "nras-gpu-verifier", "noble-response-binder"]);

export interface ProductionPlugs {
  quoteVerifier?: QuoteVerifier; gpuVerifier?: GpuVerifier; gatewayVerifier?: GatewayVerifier; responseBinder?: ResponseSignatureBinder;
}

export function productionPlugsRequired(env: NodeJS.ProcessEnv | Record<string, string | undefined>, requireProductionPlugs?: boolean): boolean {
  return env.NODE_ENV === "production" || requireProductionPlugs === true;
}

export const isUnwiredPlugName = (n: string | undefined) => !n || UNWIRED_PLUG_NAMES.has(n) || /(^|-)(stub|mock)(-|$)/i.test(n);

/** Throws `unwired_plug_forbidden_in_production` if any plug is missing (⇒ stub default), a stub, a mock, or an unwired Dcap/Nras stub. */
export function assertPlugsProductionReady(p: ProductionPlugs, opts: { requireBinder?: boolean; bindOnly?: boolean } = {}): void {
  const slots: [string, { name: string } | undefined][] = opts.bindOnly ? [] : [
    ["quoteVerifier", p.quoteVerifier], ["gpuVerifier", p.gpuVerifier], ["gatewayVerifier", p.gatewayVerifier],
  ];
  if (opts.requireBinder || opts.bindOnly || p.responseBinder) slots.push(["responseBinder", p.responseBinder]);
  for (const [slot, plug] of slots)
    if (!plug?.name || !WIRED_PLUG_NAMES.has(plug.name)) throw new AttestationError("unwired_plug", `unwired_plug_forbidden_in_production: ${slot}=${plug?.name ?? "default-stub"}`);
}

