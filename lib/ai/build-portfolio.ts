import { getAI, geminiAvailable, flashModel } from './gemini';
import { ALL_STOCKS } from '@/lib/data/nifty50';

export interface PortfolioBuildResult {
  symbols: string[];       // e.g. ['RELIANCE.NS', 'TCS.NS', ...]
  weights: number[];       // normalized, sums to 1
  rationale: string;       // 2-3 sentence explanation
  themeLabel: string;      // e.g. "Defensive Growth", "IT-Heavy Export Play"
}

const SYSTEM_PROMPT = `You are an expert Indian equity portfolio strategist. Given a user's natural language portfolio goal, select 3–6 stocks from the provided Nifty 50 / Nifty Next 50 universe and assign portfolio weights.

STRICT RULES:
1. Only select symbols from the exact list provided. Do not invent tickers.
2. Weights must be positive, sum to 1.0 (100%).
3. Match the user's intent (defensive, growth, sector-specific, risk level).
4. Give a concise themeLabel (2-4 words, e.g. "Defensive FMCG Tilt").
5. Give a 2-3 sentence rationale explaining the selection.
6. Output ONLY valid JSON matching the schema exactly.`;

export async function buildPortfolio(prompt: string): Promise<PortfolioBuildResult> {
  if (!geminiAvailable()) {
    throw new Error('Gemini API key required for portfolio builder');
  }

  // Provide a compact universe to stay within token budget
  const universe = ALL_STOCKS.map((s) => ({
    symbol: s.symbol,
    name: s.name,
    sector: s.sector,
    universe: s.universe,
  }));

  const ai = getAI();
  const response = await ai.models.generateContent({
    model: flashModel,
    config: {
      temperature: 0.4,
      responseMimeType: 'application/json',
      systemInstruction: SYSTEM_PROMPT,
    },
    contents: [{
      role: 'user',
      parts: [{
        text: `User portfolio goal: "${prompt}"

Available stocks (ONLY choose from these):
${JSON.stringify(universe, null, 0)}

Return JSON with this exact shape:
{
  "symbols": ["RELIANCE.NS", "TCS.NS"],
  "weights": [0.5, 0.5],
  "rationale": "2-3 sentence explanation of the selection",
  "themeLabel": "2-4 word theme"
}`
      }],
    }],
  });

  const text = response.text ?? '';
  const parsed = JSON.parse(text) as PortfolioBuildResult;

  // Validate symbols are in our universe
  const validSymbols = new Set(ALL_STOCKS.map((s) => s.symbol));
  const filteredSymbols = parsed.symbols.filter((s) => validSymbols.has(s));
  if (filteredSymbols.length < 2) {
    throw new Error('AI returned fewer than 2 valid symbols from the universe');
  }

  // Normalize weights to match filtered symbols
  const filteredWeights = filteredSymbols.map((_, i) => parsed.weights[i] ?? (1 / filteredSymbols.length));
  const total = filteredWeights.reduce((s, w) => s + w, 0);
  const normalizedWeights = filteredWeights.map((w) => w / total);

  return {
    symbols: filteredSymbols,
    weights: normalizedWeights,
    rationale: parsed.rationale ?? '',
    themeLabel: parsed.themeLabel ?? 'Custom Portfolio',
  };
}
