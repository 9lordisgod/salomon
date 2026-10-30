import { describe, it, expect, vi } from "vitest";
import { ask, AskDenied, type LocalCompleter } from "../src/ask.js";
import { explainRefuse } from "../src/refuseReasons.js";

const mk = () => { const complete = vi.fn(async (_m: { role: string; content: string }[]) => ({ content: "ok" })); return { complete } satisfies LocalCompleter; };

describe("ask (P3-M1)", () => {
  it("happy path passes sanitized text to completer", async () => {
    const c = mk(); const r = await ask("What is source protection?", { completer: c });
    expect(r).toEqual({ content: "ok", redactions: [] });
    const msgs = c.complete.mock.calls[0][0];
    expect(msgs[0].role).toBe("system"); expect(msgs[1]).toEqual({ role: "user", content: "What is source protection?" });
  });
  it("custom system prompt", async () => {
    const c = mk(); await ask("hi", { completer: c, system: "S" }); expect(c.complete.mock.calls[0][0][0].content).toBe("S");
  });
  it("rejects PEM private key; completer not called", async () => {
    const c = mk();
    const e = await ask("-----BEGIN PRIVATE KEY----- abc", { completer: c }).catch((x) => x);
    expect(e).toBeInstanceOf(AskDenied); expect(e.reasons).toContain("secret:pem_private_key");
    expect(e.plain).toMatch(/private key/); expect(c.complete).not.toHaveBeenCalled();
  });
  it("rejects sk- api key; completer not called", async () => {
    const c = mk();
    const e = await ask("use sk-abcdefghijklmnop1234 please", { completer: c }).catch((x) => x);
    expect(e).toBeInstanceOf(AskDenied); expect(e.plain).toMatch(/API key/); expect(c.complete).not.toHaveBeenCalled();
  });
  it("redacts near account and still asks", async () => {
    const c = mk(); const r = await ask("Who controls alice.near?", { completer: c });
    expect(r.redactions).toEqual([{ kind: "named_account", placeholder: "[NAMED_ACCOUNT]" }]);
    expect(c.complete.mock.calls[0][0][1].content).toBe("Who controls [NAMED_ACCOUNT]?");
  });
  it("explainRefuse handles unknown codes and dedupes", () => {
    const s = explainRefuse(["weird", "weird2"]); expect(s.split("\n")).toHaveLength(2); expect(s).toMatch(/nothing was sent/);
  });
});
