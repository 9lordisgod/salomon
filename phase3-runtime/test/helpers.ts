import type { LocalCompleterLike } from "../src/index.js";
export type Reply = { content?: string | null; tool_calls?: unknown[] };
export function mockCompleter(replies: Reply[] | ((n: number) => Reply), seen: any[] = []): LocalCompleterLike & { seen: any[]; calls: number } {
  const c = { kind: "local" as const, seen, calls: 0, async complete(_m: string, body: any) {
    c.calls++; seen.push(JSON.parse(JSON.stringify(body)));
    const r = typeof replies === "function" ? replies(c.calls) : replies[Math.min(c.calls - 1, replies.length - 1)];
    return { local: true as const, response: { choices: [{ message: { content: r.content ?? null, tool_calls: r.tool_calls } }] }, requestHash: "rq", responseHash: "rs" };
  } };
  return c;
}
export const call = (name: string, args: unknown, id = "c1") => ({ id, type: "function", function: { name, arguments: JSON.stringify(args) } });
