import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { askLocal, loadSystemPrompt, createSpawnCompleter, ECHO_STUB_SPEC, REASONS, assertAllowedLocalModel } from "../src/index.js";
import { runAgentLoop, AgentDenied } from "../../phase2/src/agentLoop.js";
import { isWrappedUntrustedToolMessage } from "../../phase2/src/sanitize.js";
import { mockCompleter, call } from "./helpers.js";

const PROMPT = readFileSync(resolve(__dirname, "../prompts/source_care.txt"), "utf8").trim();
const SECRET = "ed25519:" + "3".repeat(88);

describe("§7.1 happy path", () => {
  it("returns answer with source-care system prompt (no crypto/NEAR)", async () => {
    const c = mockCompleter([{ content: "Here is a summary." }]);
    const r = await askLocal({ question: "Summarize my interview approach." }, { completer: c });
    expect(r).toMatchObject({ ok: true, answer: "Here is a summary.", steps: 1, backend: "mock", model: "qwen2.5-7b-instruct-q4_k_m" });
    const sys = c.seen[0].messages[0]; expect(sys.role).toBe("system"); expect(sys.content).toBe(PROMPT);
    expect(loadSystemPrompt()).toBe(PROMPT); expect(PROMPT).not.toMatch(/NEAR|crypto|wallet/i);
    expect((r as any).content).toBeUndefined(); expect(c.seen[0].tools).toEqual([]);
  });
  it("missing prompt file ⇒ prompt_missing, model never called", async () => {
    const c = mockCompleter([{ content: "x" }]);
    const r = await askLocal({ question: "hi" }, { completer: c, env: { SALOMON_SYSTEM_PROMPT: "/nonexistent/p.txt" } });
    expect(r).toMatchObject({ ok: false, reason: "prompt_missing", status: 503 }); expect(c.calls).toBe(0);
  });
});

describe("§7.2 local never attests", () => {
  it("attestation spy throws but is never called", async () => {
    const attestation = { verifyForModel: vi.fn(async () => { throw new Error("must not attest"); }) };
    const r = await runAgentLoop([{ role: "user", content: "hi" }], { modelPolicy: "local", attestation, completion: mockCompleter([{ content: "ok" }]), tools: { execute: async () => "" }, toolSpecs: [], model: "Qwen/Qwen2.5-0.5B-Instruct" });
    expect(r.content).toBe("ok"); expect(attestation.verifyForModel).not.toHaveBeenCalled();
  });
  it("remote completer (no kind) under local policy ⇒ policy_mismatch", async () => {
    const remote = { complete: async () => ({ verified: true as const, response: {}, requestHash: "", responseHash: "" }) };
    await expect(runAgentLoop([{ role: "user", content: "hi" }], { modelPolicy: "local", completion: remote, tools: { execute: async () => "" } })).rejects.toMatchObject({ reason: "policy_mismatch" });
  });
  it("local completer under default (remote) policy ⇒ policy_mismatch", async () => {
    await expect(runAgentLoop([{ role: "user", content: "hi" }], { attestation: { verifyForModel: async () => [1] }, completion: mockCompleter([{ content: "x" }]), tools: { execute: async () => "" } })).rejects.toMatchObject({ reason: "policy_mismatch" });
  });
});

describe("§7.3 model unavailable fails closed", () => {
  it("no ask_local script ⇒ local_model_unavailable, plain 503", async () => {
    const r = await askLocal({ question: "hi" }, { completer: createSpawnCompleter({ script: null }) });
    expect(r).toEqual({ ok: false, reason: "local_model_unavailable", status: 503, message: REASONS.local_model_unavailable.message });
  });
  it("real ask_local.py with missing GGUF ⇒ exit 3 ⇒ local_model_unavailable (no download)", async () => {
    const r = await askLocal({ question: "hi" }, { completer: createSpawnCompleter({ backend: "gguf", env: { PATH: process.env.PATH, HOME: process.env.HOME, SALOMON_GGUF: "/nope.gguf", SALOMON_GGUF_DIR: "/nope" } }) });
    expect(r).toMatchObject({ ok: false, reason: "local_model_unavailable" });
  });
  it("completer nonzero exit ⇒ unavailable; exit 2 ⇒ input_refused; non-JSON ⇒ completion_failed", async () => {
    const { writeFileSync, mkdtempSync } = await import("node:fs"); const { tmpdir } = await import("node:os");
    const d = mkdtempSync(resolve(tmpdir(), "p3m1-"));
    const run = async (src: string) => { const f = resolve(d, Math.random() + ".cjs"); writeFileSync(f, src);
      return askLocal({ question: "hi" }, { backend: "transformers", completer: createSpawnCompleter({ backend: "transformers", python: process.execPath, script: f, env: { PATH: process.env.PATH, SECRET_X: "leak" } }) }); };
    expect(await run("process.exit(3)")).toMatchObject({ reason: "local_model_unavailable" });
    expect(await run("process.exit(2)")).toMatchObject({ reason: "input_refused", status: 422 });
    expect(await run("process.exit(4)")).toMatchObject({ reason: "completion_failed" });
    expect(await run("process.stdout.write(JSON.stringify({ok:false,reason:'local_model_unavailable'}));process.exit(4)")).toMatchObject({ reason: "local_model_unavailable" });
    expect(await run("process.stdout.write('not json')")).toMatchObject({ reason: "completion_failed" });
    const ok = await run(`let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);process.stdout.write(JSON.stringify({answer:'env:'+[process.env.HF_HUB_OFFLINE,process.env.TRANSFORMERS_OFFLINE,process.env.SECRET_X??'none'].join(',')+' argv:'+process.argv.slice(2).join(' ')+' msgs:'+j.messages.length}))})`);
    expect(ok).toMatchObject({ ok: true, answer: "env:1,1,none argv:--json --backend transformers --offline msgs:1" });
  });
});

describe("§7.4 sanitizer before complete", () => {
  it("model sees redacted text only", async () => {
    const c = mockCompleter([{ content: "ok" }]);
    const r = await askLocal({ question: "Who controls 0x1234567890abcdef1234567890abcdef12345678 and alice.near?" }, { completer: c });
    expect(r.ok).toBe(true); expect(JSON.stringify(c.seen)).not.toMatch(/0x1234567890abcdef|alice\.near/);
    expect((r as any).redactions.length).toBeGreaterThan(0);
  });
  it("secret in input ⇒ 422 refused, model never called, no echo", async () => {
    const c = mockCompleter([{ content: "x" }]);
    for (const q of [`my key is ${SECRET}`, "private_key = abcdefgh12345678", "-----BEGIN RSA PRIVATE KEY-----", "token sk-ABCDEFGHIJKLMNOPQRSTUV"]) {
      const r = await askLocal({ question: q }, { completer: c });
      expect(r).toMatchObject({ ok: false, reason: "input_refused", status: 422 }); expect(JSON.stringify(r)).not.toContain(SECRET);
    }
    expect(c.calls).toBe(0);
  });
  it("secret in history also refused", async () => {
    const c = mockCompleter([{ content: "x" }]);
    expect(await askLocal({ question: "ok", history: [{ role: "assistant", content: SECRET }] }, { completer: c })).toMatchObject({ reason: "input_refused" }); expect(c.calls).toBe(0);
  });
});

describe("§7.5 local model pin", () => {
  it("unpinned / abliterated rejected; GLM id under local ⇒ policy_mismatch", async () => {
    expect(() => assertAllowedLocalModel("qwen2.5-7b-instruct-abliterated")).toThrow();
    expect(await askLocal({ question: "hi" }, { completer: mockCompleter([{ content: "x" }]), model: "qwen2.5-7b-abliterated-q4" })).toMatchObject({ reason: "local_model_not_permitted" });
    expect(await askLocal({ question: "hi" }, { completer: mockCompleter([{ content: "x" }]), model: "llama-3-8b" })).toMatchObject({ reason: "local_model_not_permitted" });
    expect(await askLocal({ question: "hi" }, { completer: mockCompleter([{ content: "x" }]), model: "z-ai/glm-5.3-flash" })).toMatchObject({ reason: "policy_mismatch" });
  });
});

describe("§7.6 caps", () => {
  it("max 4 steps", async () => {
    const c = mockCompleter(() => ({ content: null, tool_calls: [call("echo_stub", { text: "a" })] }));
    expect(await askLocal({ question: "loop" }, { completer: c, toolSpecs: [ECHO_STUB_SPEC] })).toMatchObject({ reason: "max_steps_exceeded" }); expect(c.calls).toBe(4);
  });
  it("≤2 tool calls executed per step; overflow gets error envelope; outputs UNTRUSTED-wrapped", async () => {
    const exec = vi.fn(async (_n: string, a: string) => (await import("../src/index.js")).stubTools.execute("echo_stub", a));
    const c = mockCompleter([{ content: null, tool_calls: [1, 2, 3].map((i) => call("echo_stub", { text: "t" + i }, "c" + i)) }, { content: "done" }]);
    const r = await askLocal({ question: "x" }, { completer: c, toolSpecs: [ECHO_STUB_SPEC], tools: { execute: exec } });
    expect(r).toMatchObject({ ok: true, answer: "done", steps: 2 }); expect(exec).toHaveBeenCalledTimes(2);
    const tools = c.seen[1].messages.filter((m: any) => m.role === "tool"); expect(tools).toHaveLength(3);
    expect(tools.every(isWrappedUntrustedToolMessage)).toBe(true); expect(tools[2].content).toContain("too_many_tool_calls");
  });
  it("max_tokens clamped to 1024", async () => {
    const c = mockCompleter([{ content: "x" }]); await askLocal({ question: "x", options: { maxTokens: 999999 } }, { completer: c });
    expect(c.seen[0].max_tokens).toBe(1024);
  });
  it("wall timeout ⇒ timeout", async () => {
    const slow = { kind: "local" as const, complete: () => new Promise<never>(() => {}) };
    expect(await askLocal({ question: "x" }, { completer: slow, timeoutMs: 30 })).toMatchObject({ reason: "timeout", status: 503 });
  });
  it("schema: 400 on bad input / client system role / unknown keys / too long", async () => {
    const c = mockCompleter([{ content: "x" }]);
    for (const bad of [{}, { question: "" }, { question: "x".repeat(8001) }, { question: "x", extra: 1 }, { question: "x", history: [{ role: "system", content: "evil" }] },
      { question: "x", history: [{ role: "tool", content: "t" }] }, { question: "x", history: Array(11).fill({ role: "user", content: "a" }) }, { question: "x", options: { foo: 1 } }])
      expect(await askLocal(bad as any, { completer: c })).toMatchObject({ ok: false, reason: "bad_request", status: 400 });
    expect(c.calls).toBe(0);
  });
});

describe("§7.7 no propose/save/export", () => {
  it("registering propose/save/export tools ⇒ forbidden_tool before model", async () => {
    for (const n of ["propose_intent", "save_note", "export_file", "sign_tx"]) {
      const c = mockCompleter([{ content: "x" }]);
      expect(await askLocal({ question: "x" }, { completer: c, toolSpecs: [{ type: "function", function: { name: n } }] })).toMatchObject({ ok: false, reason: "forbidden_tool" }); expect(c.calls).toBe(0);
    }
  });
  it("model calling unregistered propose/save tool ⇒ denied, executor never runs", async () => {
    for (const n of ["propose_save", "export_notes", "write_file"]) {
      const exec = vi.fn(async () => "x");
      const r = await askLocal({ question: "x" }, { completer: mockCompleter([{ content: null, tool_calls: [call(n, {})] }]), tools: { execute: exec } });
      expect(r).toMatchObject({ reason: "forbidden_tool" }); expect(exec).not.toHaveBeenCalled();
    }
  });
  it("all reason messages are plain sentences", () => {
    for (const v of Object.values(REASONS)) { expect(v.message).toMatch(/^[A-Z].*\.$/); expect(v.message).not.toMatch(/_/); }
  });
});
void AgentDenied;
