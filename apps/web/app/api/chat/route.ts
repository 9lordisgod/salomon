import { convertToModelMessages, createUIMessageStreamResponse, simulateReadableStream, streamText, toUIMessageStream, UIMessage } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { SYSTEM_PROMPT } from '@/lib/prompt';
import { maskText } from '@/lib/mask';

export const maxDuration = 30;

const SECRET = /(sk-[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|ghp_[A-Za-z0-9]{20,}|(?:password|passwd|api[_-]?key|token)\s*[:=]\s*\S+)/gi;

function demoModel(lastUser: string) {
  const refused = lastUser.includes('[REDACTED-SECRET]');
  const reply = refused
    ? "I won't repeat that: it looks like a credential or secret, and credentials never enter my context. I removed it before reading your message. If you need to store it, use your password manager, not this chat."
    : `DEMO MODE — no model is connected (set AI_GATEWAY_API_KEY on the server). Here is what Salomon received after masking:\n\n> ${lastUser.slice(0, 600)}\n\nAny names, emails, phones, and handles above were replaced with tokens before reaching the model. I can only propose a save or export; you approve it on the Approvals screen.`;
  const words = reply.split(/(\s+)/);
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunkDelayInMs: 15,
        chunks: [
          { type: 'text-start', id: 't1' },
          ...words.map((w) => ({ type: 'text-delta' as const, id: 't1', delta: w })),
          { type: 'text-end', id: 't1' },
          { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, logprobs: undefined,
            usage: { inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: words.length, text: words.length, reasoning: undefined } } },
        ],
      }),
    }),
  });
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  // Server-side defense in depth: strip secrets and mask source identity before any model sees text.
  const safe = messages.slice(-20).map((m) => ({
    ...m,
    parts: m.parts.map((p) => (p.type === 'text' ? { ...p, text: maskText(p.text.replace(SECRET, '[REDACTED-SECRET]').slice(0, 8000)).text } : p)),
  })) as UIMessage[];
  const last = safe.filter((m) => m.role === 'user').at(-1);
  const lastText = last?.parts.map((p) => (p.type === 'text' ? p.text : '')).join('') ?? '';
  const live = Boolean(process.env.AI_GATEWAY_API_KEY);

  const result = streamText({
    model: live ? (process.env.SALOMON_MODEL ?? 'anthropic/claude-sonnet-5.5') : demoModel(lastText),
    instructions: SYSTEM_PROMPT,
    messages: await convertToModelMessages(safe),
  });
  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
    headers: { 'x-salomon-mode': live ? 'gateway' : 'demo' },
  });
}
