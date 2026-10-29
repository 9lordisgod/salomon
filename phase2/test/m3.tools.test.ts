import { describe, it, expect } from "vitest";
import { NearReadOnlyTools, VIEW_STATE_MAX_ENTRIES, VIEW_STATE_MAX_BYTES, MAX_RPC_BYTES } from "../src/tools/nearReadOnly.js";
import { runAgentLoop, AgentDenied, AGENT_SYSTEM_PROMPT } from "../src/agentLoop.js";
import { AttestationError } from "../../phase1.5-attestation/src/types.js";

const mk = (result: unknown, raw?: string) => { const bodies: any[] = []; let hit = 0;
  const t = new NearReadOnlyTools({ fetch: async (_u, i) => { hit++; bodies.push(JSON.parse(i.body)); return { status: 200, text: async () => raw ?? JSON.stringify({ result }) }; } });
  return { t, bodies, hits: () => hit }; };
const env = (w: string) => JSON.parse(w).untrusted_tool_output;
const data = (w: string) => JSON.parse(env(w).data_json);
const att = (fails: unknown[] = []) => { let n = 0; return { calls: () => n, verifyForModel: async () => { const f = fails[n++]; if (f) throw f; return [{}]; } }; };
const tc = (calls: [string, object][]) => ({ verified: true as const, requestHash: "r", responseHash: "s", response: { choices: [{ message: { role: "assistant", content: null,
  tool_calls: calls.map(([n, a], i) => ({ id: "c" + i, type: "function", function: { name: n, arguments: JSON.stringify(a) } })) } }] } });
const fin = (c: string) => ({ verified: true as const, requestHash: "r", responseHash: "s", response: { choices: [{ message: { role: "assistant", content: c } }] } });

describe("M3 read-only tools", () => {
  it("view_access_key_list: query RPC, wrapped, validated", async () => {
    const m = mk({ block_height: 1, keys: [{ public_key: "ed25519:x", access_key: { nonce: 1, permission: "FullAccess" } }] });
    const w = await m.t.execute("view_access_key_list", '{"account_id":"near"}');
    expect(env(w).ok).toBe(true); expect(env(w).notice).toMatch(/UNTRUSTED/);
    expect(data(w).key_count).toBe(1);
    expect(m.bodies[0]).toMatchObject({ method: "query", params: { request_type: "view_access_key_list", finality: "final", account_id: "near" } });
    expect(env(await m.t.execute("view_access_key_list", '{"account_id":"Bad Id"}')).ok).toBe(false);
    expect(m.hits()).toBe(1);
  });
  it("view_state: rejects bad prefix / non-string prefix without RPC", async () => {
    const m = mk({ values: [] });
    for (const a of ['{"account_id":"near","prefix_base64":"!!"}', '{"account_id":"near","prefix_base64":5}', '{"account_id":"x y"}', `{"account_id":"near","prefix_base64":"${"A".repeat(400)}"}`])
      expect(env(await m.t.execute("view_state", a)).ok).toBe(false);
    expect(m.hits()).toBe(0);
  });
  it("view_state: hard entry cap, flagged truncated, parseable", async () => {
    const values = Array.from({ length: 500 }, (_, i) => ({ key: Buffer.from("k" + i).toString("base64"), value: "dg==" }));
    const m = mk({ block_height: 9, values });
    const w = await m.t.execute("view_state", '{"account_id":"wrap.near","prefix_base64":"aw=="}');
    const d = data(w);
    expect(d.returned_entries).toBe(VIEW_STATE_MAX_ENTRIES); expect(d.total_entries).toBe(500); expect(d.state_truncated).toBe(true);
    expect(m.bodies[0].params).toMatchObject({ request_type: "view_state", prefix_base64: "aw==", include_proof: false });
  });
  it("view_state: byte cap with huge values; envelope bounded", async () => {
    const values = Array.from({ length: 10 }, () => ({ key: "a2V5", value: "A".repeat(50_000) }));
    const w = await mk({ values }).t.execute("view_state", '{"account_id":"near"}');
    expect(w.length).toBeLessThan(12_000);
    const d = data(w); expect(d.state_truncated).toBe(true);
    const bytes = d.values.reduce((n: number, v: any) => n + v.key.length + v.value.length, 0);
    expect(bytes).toBeLessThanOrEqual(VIEW_STATE_MAX_BYTES);
  });
  it("refuses oversized raw RPC responses (never dumps)", async () => {
    const w = await mk(null, JSON.stringify({ result: { values: [{ key: "a", value: "B".repeat(MAX_RPC_BYTES) }] } })).t.execute("view_state", '{"account_id":"near"}');
    expect(env(w).ok).toBe(false); expect(data(w).error).toBe("rpc_response_too_large");
  });
  it("block: default final, height, hash; bad ids refused", async () => {
    const m = mk({ author: "a.near", header: { height: 5, hash: "h", secret_extra: "x" }, chunks: [1, 2] });
    const d = data(await m.t.execute("block", "{}"));
    expect(m.bodies[0]).toMatchObject({ method: "block", params: { finality: "final" } });
    expect(d.header.height).toBe(5); expect(d.chunk_count).toBe(2); expect(d.header.secret_extra).toBeUndefined();
    await m.t.execute("block", '{"block_id":123}'); expect(m.bodies[1].params).toEqual({ block_id: 123 });
    const hash = "9".repeat(44); await m.t.execute("block", JSON.stringify({ block_id: hash })); expect(m.bodies[2].params).toEqual({ block_id: hash });
    for (const a of ['{"block_id":-1}', '{"block_id":"0xdead"}', '{"finality":"none"}', '{"block_id":1.5}']) expect(env(await m.t.execute("block", a)).ok).toBe(false);
    expect(m.hits()).toBe(3);
  });
  it("gas_price: null default, height, bad height refused", async () => {
    const m = mk({ gas_price: "100000000" });
    expect(data(await m.t.execute("gas_price", "{}")).gas_price).toBe("100000000");
    expect(m.bodies[0]).toMatchObject({ method: "gas_price", params: [null] });
    await m.t.execute("gas_price", '{"block_height":7}'); expect(m.bodies[1].params).toEqual([7]);
    expect(env(await m.t.execute("gas_price", '{"block_height":"7"}')).ok).toBe(false);
  });
  it("write/sign tool names still refused with no RPC", async () => {
    const m = mk({});
    for (const n of ["send_tx", "broadcast_tx_async", "add_key", "delete_key", "transfer", "sign_transaction"]) expect(data(await m.t.execute(n, "{}")).error).toBe("tool_not_permitted");
    expect(m.hits()).toBe(0);
  });
});

describe("M3 multi-step loop", () => {
  it("chains 3 tools across steps, sanitized + system prompt injected", async () => {
    const seen: any[] = []; const script = [tc([["view_account", { account_id: "near" }]]), tc([["view_access_key_list", { account_id: "near" }], ["gas_price", {}]]), fin("done")];
    const executed: string[] = [];
    const r = await runAgentLoop([{ role: "user", content: "info on near, my key ed25519:5JueXZhEEVqGVT5powZ5twyPP8wrap" }], {
      attestation: att(), tools: { execute: async (n) => { executed.push(n); return JSON.stringify({ untrusted_tool_output: { tool: n, ok: true } }); } },
      completion: { complete: async (_m, b) => { seen.push(b); return script.shift()!; } } });
    expect(r.steps).toBe(3); expect(executed).toEqual(["view_account", "view_access_key_list", "gas_price"]);
    expect(seen[0].messages[0]).toEqual({ role: "system", content: AGENT_SYSTEM_PROMPT });
    expect(AGENT_SYSTEM_PROMPT).toMatch(/multi-step/i); expect(AGENT_SYSTEM_PROMPT).toMatch(/UNTRUSTED/);
    expect(seen[2].messages.filter((m: any) => m.role === "tool")).toHaveLength(3);
  });
  it("default step cap 8; hard cap 12", async () => {
    const loop = (maxSteps?: number) => { let n = 0; return runAgentLoop([{ role: "user", content: "x" }], { attestation: att(), maxSteps,
      tools: { execute: async () => "{}" }, completion: { complete: async () => { n++; return tc([["block", {}]]); } } }).catch((e) => ({ e, n })); };
    const a: any = await loop(); expect(a.e).toBeInstanceOf(AgentDenied); expect(a.n).toBe(8);
    const b: any = await loop(99); expect(b.n).toBe(12);
  });
  it("model_not_permitted for non-GLM (e.g. abliterated)", async () => {
    await expect(runAgentLoop([{ role: "user", content: "x" }], { model: "huihui-ai/DeepSeek-R1-abliterated", attestation: att(), tools: { execute: async () => "" },
      completion: { complete: async () => fin("x") } })).rejects.toThrow("model_not_permitted");
  });
  it("allowlist miss retries then passes; CM missing denies immediately", async () => {
    const a = att([new AttestationError("allowlist", "miss")]);
    await runAgentLoop([{ role: "user", content: "x" }], { attestation: a, tools: { execute: async () => "" }, completion: { complete: async () => fin("ok") } });
    expect(a.calls()).toBe(2);
    const b = att([new AttestationError("compose_manager_missing" as any, "cm")]);
    await expect(runAgentLoop([{ role: "user", content: "x" }], { attestation: b, tools: { execute: async () => "" }, completion: { complete: async () => fin("ok") } })).rejects.toBeInstanceOf(AgentDenied);
    expect(b.calls()).toBe(1);
  });
});
