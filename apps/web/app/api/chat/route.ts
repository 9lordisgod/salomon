import { convertToModelMessages, createUIMessageStreamResponse, simulateReadableStream, streamText, toUIMessageStream, UIMessage } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { SYSTEM_PROMPT } from '@/lib/prompt';
import { maskText } from '@/lib/mask';
import { askLocal } from '@/lib/askLocal';
import { chatMode, DEFAULT_GATEWAY_MODEL } from '@/lib/mode';

export const maxDuration = 60;

const SECRET = /(sk-[A-Za-z0-9]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)|ghp_[A-Za-z0-9]{20,}|(?:password|passwd|api[_-]?key|token)\s*[:=]\s*\S+)/gi;

/** Streams a fixed text word-by-word. Used for local answers, refusals and demo — never a cloud call. */
function textModel(reply: string) {
  const words = reply.split(/(\s+)/);
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunkDelayInMs: 12,
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
  // Defense in depth: strip secrets and mask identities server-side before any model sees text.
  const safe = messages.slice(-20).map((m) => ({
    ...m,
    parts: m.parts.map((p) => (p.type === 'text' ? { ...p, text: maskText(p.text.replace(SECRET, '[REDACTED-SECRET]').slice(0, 12000)).text } : p)),
  })) as UIMessage[];
  const lastText = safe.filter((m) => m.role === 'user').at(-1)?.parts.map((p) => (p.type === 'text' ? p.text : '')).join('') ?? '';
  const mode = chatMode();
  const headers = { 'x-salomon-mode': mode };

  if (lastText.includes('[REDACTED-SECRET]')) {
    const r = streamText({ model: textModel("I won't process that: it contains what looks like a credential or private key, so I removed it before anything reached a model. Store secrets in a password manager, then ask again without them."), prompt: 'refuse' });
    return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: r.stream }), headers });
  }

  if (mode === 'gateway') {
    try {
      const result = streamText({
        model: process.env.SALOMON_MODEL || DEFAULT_GATEWAY_MODEL,
        instructions: SYSTEM_PROMPT,
        messages: await convertToModelMessages(safe),
        onError: ({ error }) => { console.error('[salomon gateway]', error); },
      });
      return createUIMessageStreamResponse({
        stream: toUIMessageStream({
          stream: result.stream,
          onError: (error) => {
            const msg = error instanceof Error ? error.message : String(error);
            if (/credit card|customer_verification|free credits/i.test(msg)) {
              return 'REMOTE GATEWAY needs a payment method on the Vercel AI Gateway account before it can answer (free credits unlock after a card is added). This request left nothing local.';
            }
            if (/api key|unauthorized|401|403/i.test(msg)) {
              return 'REMOTE GATEWAY rejected the API key. Check AI_GATEWAY_API_KEY in .env.local — never commit it.';
            }
            return `REMOTE GATEWAY error: ${msg.slice(0, 280)}`;
          },
        }),
        headers,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const reply = /credit card|customer_verification/i.test(msg)
        ? 'REMOTE GATEWAY needs a payment method on the Vercel AI Gateway account before it can answer (free credits unlock after a card is added).'
        : `REMOTE GATEWAY failed: ${msg.slice(0, 280)}`;
      const r = streamText({ model: textModel(reply), prompt: 'gateway-error' });
      return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: r.stream }), headers });
    }
  }

  // local / stub / demo: offline Runtime askLocal (fail closed), streamed for UX.
  let reply: string;
  if (mode === 'demo') {
    reply = 'No model is connected, so nothing was generated and nothing left this machine.\n\nTo get real answers: install a local GGUF (SALOMON_GGUF) for on-device mode, or set AI_GATEWAY_API_KEY for clearly-labeled REMOTE mode.';
  } else {
    const r = await askLocal({ question: lastText });
    reply = r.ok ? (r as { answer: string }).answer : `Refused (${(r as { reason?: string }).reason}): ${(r as { message?: string }).message}`;
  }
  const r = streamText({ model: textModel(reply), prompt: lastText || 'ask' });
  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: r.stream }), headers });
}
