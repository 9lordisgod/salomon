import { describe, it, expect } from "vitest";
import { defaultSanitizer, isWrappedUntrustedToolMessage, sanitizeMessages, SanitizerRejected, type ChatMessage } from "../src/sanitize.js";
import { wrapUntrusted } from "../src/tools/untrusted.js";
import { runAgentLoop, AgentDenied } from "../src/agentLoop.js";

const B64 = Buffer.from("x".repeat(120)).toString("base64"); // 160 chars
const HEX = "ab".repeat(40); // 80 hex
const viewState = () => wrapUntrusted("view_state", true, { values: [{ key: B64, value: B64 }], block_hash: HEX });
const att = () => ({ verifyForModel: async () => [{}] });

describe("soft: lighter role:tool sanitizer", () => {
  it("wrapped view_state with base64/hex does not false-reject", () => {
    const m: ChatMessage = { role: "tool", tool_call_id: "1", name: "view_state", content: viewState() };
    expect(isWrappedUntrustedToolMessage(m)).toBe(true);
    const [o] = sanitizeMessages([m]);
    expect(o.content).toContain(B64);
  });
  it("truncated preview envelope still recognized", () => {
    const content = wrapUntrusted("view_state", true, { v: B64.repeat(200) });
    expect(JSON.parse(content).untrusted_tool_output.truncated).toBe(true);
    expect(() => sanitizeMessages([{ role: "tool", content }])).not.toThrow();
  });
  it("unwrapped tool content with blob still rejects", () => {
    expect(() => sanitizeMessages([{ role: "tool", content: `raw ${B64}` }])).toThrow(SanitizerRejected);
    expect(() => sanitizeMessages([{ role: "tool", content: JSON.stringify({ untrusted_tool_output: { tool: "x", ok: true, truncated: false, notice: "n", data_json: "{}", extra: HEX } }) }])).toThrow(SanitizerRejected);
  });
  it("user/assistant blobs still reject; envelope-shaped user content not relaxed", () => {
    expect(() => defaultSanitizer([{ role: "user", content: HEX }])).toThrow(SanitizerRejected);
    expect(() => defaultSanitizer([{ role: "user", content: viewState() }])).toThrow(SanitizerRejected);
  });
  it("wrapped envelope still rejects non-blob secrets (sk-, PEM, ed25519 secret)", () => {
    for (const s of ["sk-abcdefghijklmnopqrstuv", "-----BEGIN PRIVATE KEY-----", "ed25519:" + "3".repeat(88)])
      expect(() => sanitizeMessages([{ role: "tool", content: wrapUntrusted("view_call", true, { result: s }) }])).toThrow(SanitizerRejected);
  });
  it("agent loop: view_state blob result proceeds to final answer", async () => {
    let n = 0;
    const r = await runAgentLoop([{ role: "user", content: "state of x" }], { attestation: att(), tools: { execute: async () => viewState() },
      completion: { complete: async () => ({ verified: true, requestHash: "a", responseHash: "b", response: { choices: [{ message: n++ === 0
        ? { content: null, tool_calls: [{ id: "1", function: { name: "view_state", arguments: "{}" } }] } : { content: "done" } }] } }) } });
    expect(r.content).toBe("done");
  });
  it("agent loop: SanitizerRejected maps to AgentDenied(sanitizer_rejected), no completion call", async () => {
    let calls = 0; const logs: any[] = [];
    const p = runAgentLoop([{ role: "user", content: `my key ${HEX}` }], { attestation: att(), tools: { execute: async () => "" }, log: (x) => logs.push(x),
      completion: { complete: async () => { calls++; throw new Error("no"); } } });
    await expect(p).rejects.toBeInstanceOf(AgentDenied);
    await expect(p).rejects.toMatchObject({ reason: "sanitizer_rejected", check: "sanitizer" });
    expect(calls).toBe(0);
    expect(JSON.stringify(logs)).not.toContain(HEX);
  });
  it("agent loop: unwrapped blob tool output mid-loop denies cleanly", async () => {
    let n = 0;
    const p = runAgentLoop([{ role: "user", content: "x" }], { attestation: att(), tools: { execute: async () => `raw ${B64}` },
      completion: { complete: async () => ({ verified: true, requestHash: "a", responseHash: "b", response: { choices: [{ message: n++ === 0
        ? { content: null, tool_calls: [{ id: "1", function: { name: "view_state", arguments: "{}" } }] } : { content: "leak" } }] } }) } });
    await expect(p).rejects.toMatchObject({ name: "AgentDenied", reason: "sanitizer_rejected" });
    expect(n).toBe(1);
  });
});
