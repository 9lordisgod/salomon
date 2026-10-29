import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { sanitizeForRemote, sanitizeMessages, defaultSanitizer, SanitizerRejected } from "../src/sanitize.js";
import { runAgentLoop } from "../src/agentLoop.js";

const H = "c".repeat(64);
const VEC: [string, "redact" | "reject"][] = [
  ["hello world", "redact"], [`send to ${H}`, "redact"], [`account: ${H}`, "reject"], [`bare ${H}`, "redact"],
  ["pay alice.near and bob.testnet", "redact"], ["pay alice.near", "reject"], [`0x${"a".repeat(40)} here`, "redact"],
  ["-----BEGIN PRIVATE KEY-----", "redact"], [`ed25519:${"A".repeat(88)}`, "redact"], ["sk-abcdefghijklmnopqrstu", "redact"],
  ["api_key = abcdefghijklmnop", "redact"], ["A".repeat(70), "redact"],
  ["abandon ability able about above absent absorb abstract absurd abuse access accident", "redact"],
  ["the cat and the dog sat on a mat with you and the other ones", "redact"], [`alice.near ${"d".repeat(64)}`, "reject"],
  ["x", "bogus" as any], ["view_account near", "redact"],
];
const PY = `import json,sys
sys.path.insert(0,'..')
from privacy.sanitizer import sanitize_for_remote, SanitizerConfig
v=json.load(sys.stdin); out=[]
for t,m in v:
  r=sanitize_for_remote(t, SanitizerConfig(mode=m)); out.append({"ok":r.ok,"text":r.text,"reasons":r.reasons,"kinds":[x["kind"] for x in r.redactions]})
print(json.dumps(out))`;

describe("sanitizer parity with signed privacy/sanitizer.py", () => {
  it(`${VEC.length} vectors match Python reference (ok/text/reasons/redaction kinds)`, () => {
    const py = JSON.parse(execFileSync("python3", ["-c", PY], { input: JSON.stringify(VEC), cwd: new URL("..", import.meta.url).pathname }).toString());
    VEC.forEach(([t, m], i) => { const r = sanitizeForRemote(t, { mode: m });
      expect({ ok: r.ok, text: r.text, reasons: r.reasons, kinds: r.redactions.map((x) => x.kind) }, `vec ${i}`).toEqual(py[i]); });
  });
  it("secrets rejected in every mode; non-string fail-closed", () => {
    for (const mode of ["redact", "reject"] as const) expect(sanitizeForRemote("sk-abcdefghijklmnopqrstu", { mode }).ok).toBe(false);
    expect(sanitizeForRemote(42).reasons).toEqual(["non_string_input"]);
  });
  it("default sanitizer throws SanitizerRejected on secret; loop never calls complete", async () => {
    expect(() => sanitizeMessages([{ role: "user", content: "-----BEGIN PRIVATE KEY-----" }], defaultSanitizer)).toThrow(SanitizerRejected);
    let called = false;
    await expect(runAgentLoop([{ role: "user", content: "my seed: abandon ability able about above absent absorb abstract absurd abuse access accident" }],
      { attestation: { verifyForModel: async () => [{}] } as any, completion: { complete: async () => { called = true; return {} as any; } }, tools: { execute: async () => "" } as any }))
      .rejects.toThrow("sanitizer_rejected");
    expect(called).toBe(false);
  });
});
