/**
 * OpenRouter API client — OpenAI-compatible, genuinely free models.
 * Free models include google/gemini-2.0-flash-exp:free and others.
 * No TPM/RPM nonsense on free tier — community-sponsored capacity.
 *
 * Sign up (free): https://openrouter.ai — no credit card required.
 * Add OPENROUTER_API_KEY to Vercel env vars.
 *
 * Cascade model preference: Gemini 2.0 Flash → Llama 3.3 70B → Mistral 7B
 * All three have :free variants with json response mode support.
 */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

// Models in preference order — all free, all support JSON output
const FREE_MODELS = [
  'google/gemini-2.0-flash-exp:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
];

export function openrouterAvailable(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

export interface OpenRouterOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

async function callModel(model: string, opts: OpenRouterOptions, key: string): Promise<string> {
  const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://stock-thesis-generator-mae5.vercel.app',
      'X-Title': 'Editorial Quant',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.userPrompt },
      ],
      temperature: opts.temperature ?? 0.3,
      response_format: { type: 'json_object' },
      max_tokens: 1500,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenRouter ${model} ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
    error?: { message: string };
  };

  if (data.error) throw new Error(`OpenRouter error: ${data.error.message}`);

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`OpenRouter ${model} returned empty content`);
  return content;
}

/**
 * Try free models in order until one succeeds.
 * Returns the raw JSON string — caller parses + validates.
 */
export async function openrouterGenerate(opts: OpenRouterOptions): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY not set');

  let lastErr: Error = new Error('No models attempted');
  for (const model of FREE_MODELS) {
    try {
      return await callModel(model, opts, key);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      // If rate limited on this model, try next
      if (lastErr.message.includes('429') || lastErr.message.includes('rate') || lastErr.message.includes('overloaded')) {
        continue;
      }
      // Non-rate error — rethrow immediately
      throw lastErr;
    }
  }
  throw lastErr;
}
