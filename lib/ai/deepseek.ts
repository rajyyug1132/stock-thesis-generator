/**
 * DeepSeek API client — OpenAI-compatible, free tier available.
 * Used as fallback when Gemini quota (429 / RESOURCE_EXHAUSTED) is hit.
 *
 * Sign up: https://platform.deepseek.com
 * Add DEEPSEEK_API_KEY to Vercel env vars.
 *
 * Model: deepseek-chat (DeepSeek-V3) — strong reasoning, json_object mode.
 */

const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';

export function deepseekAvailable(): boolean {
  return !!process.env.DEEPSEEK_API_KEY;
}

export interface DeepSeekOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

/**
 * Call DeepSeek chat completions with json_object response format.
 * Returns the raw JSON string (caller parses + validates with Zod).
 */
export async function deepseekGenerate(opts: DeepSeekOptions): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error('DEEPSEEK_API_KEY not set');

  const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.userPrompt },
      ],
      temperature: opts.temperature ?? 0.3,
      response_format: { type: 'json_object' },
      max_tokens: 4096,
    }),
    // Vercel serverless functions time out at 60s; DeepSeek is fast
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`DeepSeek ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('DeepSeek returned empty content');
  return content;
}

/** True when the error looks like Gemini daily quota exhaustion */
export function isGeminiQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('quota') ||
    msg.includes('rate limit')
  );
}
