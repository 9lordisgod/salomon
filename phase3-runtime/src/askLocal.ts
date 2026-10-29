/** Phase 3 M1 stable entry: askLocal(req, deps?) — used by Next.js POST /api/ask and the CLI. Propose≠act: zero tools by default. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runAgentLoop, AgentDenied, type LocalCompleterLike, type ToolExecutor, type LoopLog } from "../../phase2/src/agentLoop.js";
import { redact, sanitizeForRemote, SanitizerRejected, type ChatMessage, type Redaction } from "../../phase2/src/sanitize.js";
import { wrapUntrusted } from "../../phase2/src/tools/untrusted.js";
import { DEFAULT_LOCAL_MODEL } from "./localModel.js";
import { createSpawnCompleter, type Backend } from "./localCompleter.js";
import { REASONS, toReason, type ReasonCode } from "./reasons.js";

const HERE = dirname(fileURLToPath(import.meta.url));
export interface AskRequest { question: string; history?: { role: "user" | "assistant"; content: string }[]; options?: { maxTokens?: number } }
export interface AskOk { ok: true; answer: string; steps: number; backend: Backend | "mock"; model: string; redactions: Redaction[]; transcriptSha256: string }
export interface AskDenied { ok: false; reason: ReasonCode; message: string; status: number }
export type AskResult = AskOk | AskDenied;
export interface AskDeps {
  completer?: LocalCompleterLike; backend?: Backend | "mock"; model?: string; systemPrompt?: string;
  toolSpecs?: readonly unknown[]; tools?: ToolExecutor; timeoutMs?: number; log?: (r: LoopLog) => void; env?: NodeJS.ProcessEnv;
}
export const CAPS = { maxSteps: 4, maxTokens: 1024, questionMax: 8000, historyMax: 10, bodyMaxBytes: 16 * 1024, timeoutMs: 120_000 } as const;
export const ECHO_STUB_SPEC = { type: "function", function: { name: "echo_stub", description: "Test-only read-only echo.", parameters: { type: "object", properties: { text: { type: "string" } } } } } as const;
/** Read-only executor: only echo_stub; every output UNTRUSTED-wrapped. */
export const stubTools: ToolExecutor = { async execute(name, args) {
  if (name !== "echo_stub") return wrapUntrusted(name.slice(0, 64), false, { error: "tool_not_permitted" });
  let t = ""; try { t = String(JSON.parse(args)?.text ?? "").slice(0, 2000); } catch { return wrapUntrusted(name, false, { error: "bad_args" }); }
  return wrapUntrusted(name, true, { text: t });
} };

export function loadSystemPrompt(env: NodeJS.ProcessEnv = process.env): string {
  // Canonical = ME's phase1-slm/configs/source_care_system.txt (ask_local.py --print-prompt-path); no content fork.
  const canon = resolve(HERE, "../../phase1-slm/configs/source_care_system.txt");
  const p = env.SALOMON_SYSTEM_PROMPT || (existsSync(canon) ? canon : resolve(HERE, "../prompts/source_care.txt"));
  const s = readFileSync(p, "utf8").trim(); if (!s) throw new Error("empty"); return s;
}
export const deny = (code: string): AskDenied => { const r = toReason(code); return { ok: false, reason: r, message: REASONS[r].message, status: REASONS[r].status }; };

function validate(req: unknown): ChatMessage[] | null {
  if (!req || typeof req !== "object" || Array.isArray(req)) return null;
  const o = req as Record<string, unknown>;
  if (Object.keys(o).some((k) => !["question", "history", "options"].includes(k))) return null;
  if (typeof o.question !== "string" || o.question.trim().length < 1 || o.question.length > CAPS.questionMax) return null;
  const h = o.history ?? [];
  if (!Array.isArray(h) || h.length > CAPS.historyMax) return null;
  for (const t of h) if (!t || typeof t !== "object" || Object.keys(t).some((k) => k !== "role" && k !== "content") || !["user", "assistant"].includes((t as any).role) || typeof (t as any).content !== "string" || (t as any).content.length > CAPS.questionMax) return null;
  if (o.options !== undefined) { const op = o.options as any; if (!op || typeof op !== "object" || Object.keys(op).some((k) => k !== "maxTokens") || (op.maxTokens !== undefined && !Number.isInteger(op.maxTokens))) return null; }
  return [...(h as ChatMessage[]).map((t) => ({ role: t.role, content: t.content })), { role: "user", content: o.question }];
}

export async function askLocal(req: AskRequest, deps: AskDeps = {}): Promise<AskResult> {
  const msgs = validate(req); if (!msgs) return deny("bad_request");
  // Pre-gate (same path as phase2 defaultSanitizer): key_material_in_context + sanitizeForRemote via redact(). Secrets ⇒ refuse before model.
  const redactions: Redaction[] = [];
  try { for (const m of msgs) { redact(m.content as string); redactions.push(...sanitizeForRemote(m.content).redactions); } }
  catch (e) { return deny(e instanceof SanitizerRejected ? "input_refused" : "internal_error"); }
  let systemPrompt: string;
  try { systemPrompt = deps.systemPrompt ?? loadSystemPrompt(deps.env); } catch { return deny("prompt_missing"); }
  const backend = deps.backend ?? (deps.completer ? "mock" : ((deps.env ?? process.env).SALOMON_BACKEND as Backend) || "gguf");
  const model = deps.model ?? (backend === "transformers" ? "Qwen/Qwen2.5-0.5B-Instruct" : DEFAULT_LOCAL_MODEL);
  const completer = deps.completer ?? createSpawnCompleter({ backend: backend === "mock" ? "gguf" : backend, env: deps.env, timeoutMs: deps.timeoutMs });
  const timeoutMs = Math.min(deps.timeoutMs ?? CAPS.timeoutMs, CAPS.timeoutMs);
  let timer: NodeJS.Timeout | undefined;
  try {
    const run = runAgentLoop([{ role: "system", content: systemPrompt }, ...msgs], {
      modelPolicy: "local", completion: completer, tools: deps.tools ?? stubTools, model, systemPrompt,
      toolSpecs: deps.toolSpecs ?? [], maxSteps: CAPS.maxSteps, maxTokens: Math.min(req.options?.maxTokens ?? 512, CAPS.maxTokens), log: deps.log,
    });
    const r = await Promise.race([run, new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new AgentDenied("timeout")), timeoutMs); })]);
    return { ok: true, answer: r.content, steps: r.steps, backend, model, redactions, transcriptSha256: r.transcriptSha256 };
  } catch (e) {
    if (e instanceof AgentDenied) return deny(e.reason);
    return deny(String((e as any)?.message ?? "").includes("forbidden") ? "forbidden_tool" : "internal_error");
  } finally { if (timer) clearTimeout(timer); }
}
