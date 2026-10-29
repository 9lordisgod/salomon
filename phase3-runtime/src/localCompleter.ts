/**
 * LocalCompleter: spawns `ask_local.py --json` per request (M1; warm daemon later).
 * stdin JSON in, one JSON object out. Minimal env (no inherited secrets), offline env forced. No cloud fallback exists.
 * ME contract exit codes: 0 ok · 2 input_refused · 3 local_model_unavailable · 4 completion_failed · other/timeout/non-JSON ⇒ completion_failed.
 * GGUF resolution (SALOMON_GGUF / SALOMON_GGUF_DIR / artifacts) is done by ask_local.py; missing ⇒ exit 3. No download, no cloud fallback.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AgentDenied, type LocalCompleterLike } from "../../phase2/src/agentLoop.js";

const KNOWN = new Set(["input_refused", "local_model_unavailable", "completion_failed", "local_model_not_permitted", "timeout"]);
const HERE = dirname(fileURLToPath(import.meta.url));
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
export type { LocalCompleterLike };
export type Backend = "gguf" | "transformers";

export function findAskLocalScript(env: NodeJS.ProcessEnv = process.env): string | null {
  const c = [env.SALOMON_ASK_LOCAL, resolve(HERE, "../scripts/ask_local.py"), resolve(HERE, "../../phase1-slm/scripts/ask_local.py")];
  return c.find((p): p is string => !!p && existsSync(p)) ?? null;
}

export function createSpawnCompleter(o: { backend?: Backend; python?: string; script?: string | null; timeoutMs?: number; env?: NodeJS.ProcessEnv } = {}): LocalCompleterLike {
  const env = o.env ?? process.env; const backend = o.backend ?? ((env.SALOMON_BACKEND as Backend) || "gguf");
  return {
    kind: "local",
    async complete(model, body) {
      const script = o.script === undefined ? findAskLocalScript(env) : o.script;
      if (!script || !existsSync(script)) throw new AgentDenied("local_model_unavailable");
      const childEnv: Record<string, string> = { PATH: env.PATH ?? "/usr/bin:/bin", HOME: env.HOME ?? "/tmp", HF_HUB_OFFLINE: "1", TRANSFORMERS_OFFLINE: "1", HF_DATASETS_OFFLINE: "1" };
      for (const k of ["SALOMON_GGUF", "SALOMON_GGUF_DIR", "SALOMON_LLAMA_BACKEND"]) if (env[k]) childEnv[k] = env[k]!;
      childEnv.SALOMON_OFFLINE = "1";
      if (env.HF_HOME) childEnv.HF_HOME = env.HF_HOME;
      // ask_local.py injects the canonical source-care system prompt itself and refuses client system role.
      const input = JSON.stringify({ messages: (body.messages as any[]).filter((m: any) => m.role !== "system"), max_tokens: body.max_tokens });
      const args = [script, "--json", "--backend", backend, ...(backend === "transformers" ? ["--offline"] : [])];
      const { code, out } = await new Promise<{ code: number | null; out: string }>((res, rej) => {
        const p = spawn(o.python ?? env.SALOMON_PYTHON ?? "python3", args, { env: childEnv, stdio: ["pipe", "pipe", "ignore"] });
        let out = ""; const t = setTimeout(() => { p.kill("SIGKILL"); rej(new AgentDenied("timeout")); }, o.timeoutMs ?? 120_000);
        p.stdout.on("data", (d) => { out += d; if (out.length > 1_000_000) p.kill("SIGKILL"); });
        p.on("error", () => { clearTimeout(t); rej(new AgentDenied("local_model_unavailable")); });
        p.on("close", (code) => { clearTimeout(t); res({ code, out }); });
        p.stdin.end(input);
      });
      let j: any = null; try { j = JSON.parse(out.trim().split("\n").pop() ?? ""); } catch { j = null; }
      const byCode: Record<number, string> = { 2: "input_refused", 3: "local_model_unavailable", 4: "completion_failed" };
      if (code !== 0) {
        const r = typeof j?.reason === "string" && KNOWN.has(j.reason) ? j.reason : byCode[code ?? -1] ?? "completion_failed";
        throw new AgentDenied(r);
      }
      if (!j) throw new AgentDenied("completion_failed");
      if (j.ok === false || j.refused || j.refuse_reason) throw new AgentDenied(typeof j.reason === "string" && KNOWN.has(j.reason) ? j.reason : "input_refused");
      if (typeof j.gguf_sha256 === "string" && typeof j.gguf_sha256_expected === "string" && j.gguf_sha256 !== j.gguf_sha256_expected) throw new AgentDenied("local_model_not_permitted");
      const content = typeof j?.answer === "string" ? j.answer : typeof j?.content === "string" ? j.content : null;
      if (content === null) throw new AgentDenied("completion_failed");
      return { local: true, response: { choices: [{ message: { content } }] }, requestHash: sha(input), responseHash: sha(out) };
    },
  };
}
