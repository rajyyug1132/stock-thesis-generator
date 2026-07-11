/**
 * NVIDIA API client — OpenAI-compatible endpoint.
 * Sign up: https://build.nvidia.com — free tier available.
 * Add NVIDIA_API_KEY to Vercel env vars.
 *
 * Models: Llama 3.1 70B, Mistral Large, Gemma 2 27B.
 */

const NVIDIA_BASE = 'https://integrate.api.nvidia.com/v1';

const MODELS = [
  'nvidia/llama-3.1-70b-instruct',
  'nvidia/mistral-large',
  'nvidia/gemma-2-27b-it',
];

export function nvidiaAvailable(): boolean {
  return !!process.env.NVIDIA_API_KEY;
}

export interface NvidiaOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
}

async function callModel(model: string, opts: NvidiaOptions, key: string): Promise<string> {
  const res = await fetch(`${NVIDIA_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
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
    throw new Error(`NVIDIA ${model} ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
    error?: { message: string };
  };

  if (data.error) throw new Error(`NVIDIA error: ${data.error.message}`);

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`NVIDIA ${model} returned empty content`);
  return content;
}

export async function nvidiaGenerate(opts: NvidiaOptions): Promise<string> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw new Error('NVIDIA_API_KEY not set');

  let lastErr: Error = new Error('No models attempted');
  for (const model of MODELS) {
    try {
      return await callModel(model, opts, key);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (
        lastErr.message.includes('429') ||
        lastErr.message.includes('rate') ||
        lastErr.message.includes('overloaded') ||
        lastErr.message.includes('404')
      ) {
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr;
}
