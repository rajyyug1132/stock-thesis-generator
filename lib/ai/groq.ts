/**
 * Groq API client — OpenAI-compatible, generous free tier.
 * Free: 14,400 req/day on llama-3.3-70b-versatile, no credit card required.
 *
 * Sign up: https://console.groq.com
 * Add GROQ_API_KEY to Vercel env vars.
 *
 * Model: llama-3.3-70b-versatile — strong reasoning, json_object mode.
 */

const GROQ_BASE = 'https://api.groq.com/openai/v1';

export function groqAvailable(): boolean {
  return !!process.env.GROQ_API_KEY;
}

export interface GroqOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

/**
 * Call Groq chat completions with json_object response format.
 * Returns the raw JSON string (caller parses + validates with Zod).
 */
export async function groqGenerate(opts: GroqOptions): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');

  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile', // 12k TPM free tier; compact prompt keeps request ~2k tokens
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.userPrompt },
      ],
      temperature: opts.temperature ?? 0.3,
      response_format: { type: 'json_object' },
      max_tokens: 1200,
    }),
    signal: AbortSignal.timeout(30_000), // Groq is fast, 30s is generous
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq returned empty content');
  return content;
}

/** True when error is a Groq rate-limit (429) */
export function isGroqRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('429') || msg.includes('rate_limit') || msg.includes('rate limit');
}
