/** Generic deny list: the agent may never register or call tools that sign, send, broadcast, execute or move value. */
export const FORBIDDEN_TOOL_RE = /(^|_)(sign|submit|broadcast|settle|execute|simulate|send|publish|deposit|withdraw_now|transfer)(_|$)/i;
export const FORBIDDEN_TOOL_NAMES: ReadonlySet<string> = new Set(["sign", "submit", "broadcast", "settle", "transfer"]);
export const isForbiddenToolName = (n: string) => FORBIDDEN_TOOL_NAMES.has(n.toLowerCase()) || FORBIDDEN_TOOL_RE.test(n);
export function assertNoForbiddenTools(specs: readonly { function: { name: string } }[]): void {
  for (const s of specs) if (isForbiddenToolName(s.function.name)) throw new Error(`forbidden_tool_registered:${s.function.name}`);
}
