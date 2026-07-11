import { nvidiaGenerate, nvidiaAvailable } from './nvidia';
import type { Context } from './context';

export interface PortfolioThesis {
  generatedAt: string;
  summary: string;
  sectorBreakdown: Array<{ sector: string; weight: number; note: string }>;
  keyRisk: string;
  correlationNote: string;
  bullCase: string;
  bearCase: string;
}

const SYSTEM_PROMPT = `You are a senior portfolio analyst writing a portfolio-level investment thesis for a collection of Indian NSE-listed stocks. You receive stock-level data for each holding plus the portfolio weights.

STRICT RULES:
1. Think holistically — this is a PORTFOLIO thesis, not a list of per-stock theses.
2. Every claim must reference specific data from the provided JSON (return, volatility, sector, weight).
3. Identify sector concentration risk and correlation risk explicitly.
4. Bull and bear cases must address the PORTFOLIO as a whole, not individual stocks.
5. The keyRisk must be the single highest-impact risk to the combined portfolio.
6. Tone: institutional-grade, analytical, direct.
7. Output ONLY valid JSON matching the schema. No prose preamble.`;

const SCHEMA_HINT = `
Return JSON with this exact shape:
{
  "generatedAt": "ISO datetime",
  "summary": "2-3 sentence portfolio overview",
  "sectorBreakdown": [{ "sector": "IT", "weight": 0.35, "note": "dominant exposure — key risk" }],
  "keyRisk": "single biggest portfolio-level risk",
  "correlationNote": "how correlated are these holdings?",
  "bullCase": "2-3 sentences on the portfolio bull case",
  "bearCase": "2-3 sentences on the portfolio bear case"
}`;

export async function generatePortfolioThesis(
  contexts: Context[],
  weights: number[]
): Promise<PortfolioThesis> {
  if (!nvidiaAvailable()) {
    throw new Error('NVIDIA_API_KEY required for portfolio thesis generation');
  }

  // Build compact portfolio context
  const sectorWeights: Record<string, number> = {};
  const stockSummaries = contexts.map((ctx, i) => {
    const w = weights[i] ?? 0;
    const sector = ctx.sector ?? 'Unknown';
    sectorWeights[sector] = (sectorWeights[sector] ?? 0) + w;

    return {
      symbol: ctx.symbol.replace('.NS', ''),
      name: ctx.name,
      weight: `${(w * 100).toFixed(1)}%`,
      sector: ctx.sector,
      annualReturn: `${(ctx.stats.annualReturn * 100).toFixed(1)}%`,
      annualVol: `${(ctx.stats.annualVol * 100).toFixed(1)}%`,
      sharpe: ctx.stats.sharpe.toFixed(2),
      peRatio: ctx.fundamentals.peRatio?.toFixed(1) ?? null,
      marketCapCr: ctx.fundamentals.marketCap
        ? `₹${(ctx.fundamentals.marketCap / 1e7).toFixed(0)} Cr`
        : null,
    };
  });

  const portfolioStats = {
    numHoldings: contexts.length,
    sectorExposure: Object.entries(sectorWeights).map(([sector, weight]) => ({
      sector,
      weight: `${(weight * 100).toFixed(1)}%`,
    })),
    weightedAvgSharpe: contexts.reduce((s, ctx, i) => s + ctx.stats.sharpe * (weights[i] ?? 0), 0).toFixed(2),
    weightedAvgReturn: `${(contexts.reduce((s, ctx, i) => s + ctx.stats.annualReturn * (weights[i] ?? 0), 0) * 100).toFixed(1)}%`,
  };

  const prompt = {
    portfolioStats,
    holdings: stockSummaries,
  };

  const text = await nvidiaGenerate({
    systemPrompt: SYSTEM_PROMPT + SCHEMA_HINT,
    userPrompt: `Generate a portfolio-level thesis for this Indian equity portfolio:\n\n${JSON.stringify(prompt, null, 2)}`,
    temperature: 0.3,
  });

  const parsed = JSON.parse(text) as PortfolioThesis;
  parsed.generatedAt = new Date().toISOString();

  return parsed;
}
