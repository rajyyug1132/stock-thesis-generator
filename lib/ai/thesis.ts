import { nvidiaGenerate, nvidiaAvailable } from './nvidia';
import { ThesisSchema, type Thesis } from './schemas';
import type { Context } from './context';

const SYSTEM_PROMPT = `You are a sober equity analyst writing a structured thesis for an Indian-listed stock. You will be given a JSON object with current fundamentals, price stats, and recent news.

STRICT RULES:
1. Every numeric claim in the 'evidence' field MUST reference a number that appears in the provided JSON. Do not invent numbers, estimates, or comparisons to data not provided.
2. If you don't know a fact (e.g., 5Y average P/E), say so explicitly: "(historical comparison not available in data)". Do not guess.
3. Bull and bear cases must be genuinely opposing — not the same point reframed.
4. Risks must be specific to this company/sector, not boilerplate like "market volatility".
5. Catalysts must include a concrete timeframe (e.g., "Q1 FY27 results", "within 3 months").
6. Tone: analytical, neutral. Not promotional. Not doom-mongering.
7. Output ONLY valid JSON matching the schema. No prose preamble.
8. If the stock has a negative 1Y annual return (e.g., -34.7%) and there is recent news context explaining this drop (e.g., weak earnings guidance, margin pressure), populate the 'priceDropEvent' field with the return percent and matching news headline. Otherwise, set it to null.`;

const SCHEMA_HINT = `
Return JSON: {"symbol":"X.NS","generatedAt":"ISO date","summary":"2 sentences","bullCase":{"headline":"str","points":[{"claim":"str","evidence":"cite data numbers"}]},"bearCase":{"headline":"str","points":[{"claim":"str","evidence":"cite data numbers"}]},"risks":[{"risk":"str","severity":"high|medium|low"}],"catalysts":[{"event":"str","timeframe":"str","impact":"positive|negative|mixed"}],"priceDropEvent":null}
3-4 bull, 3-4 bear, 2-3 risks, 2-3 catalysts. Evidence MUST cite actual numbers from the data.`;

/**
 * Compact context — flattens to a small plain object to stay within tight
 * token budgets. Only non-null fundamentals are included.
 */
function compactContext(context: Context): object {
  const f = context.fundamentals;
  const funds: Record<string, number> = {};
  if (f.peRatio   != null) funds.pe   = +f.peRatio.toFixed(2);
  if (f.pbRatio   != null) funds.pb   = +f.pbRatio.toFixed(2);
  if (f.roe       != null) funds.roe  = +f.roe.toFixed(4);
  if (f.debtToEquity != null) funds.de = +f.debtToEquity.toFixed(2);
  if (f.dividendYield != null) funds.divYield = +f.dividendYield.toFixed(4);
  if (f.marketCap != null) funds.mcapCr = +(f.marketCap / 1e7).toFixed(0); // convert to ₹Cr

  return {
    symbol:  context.symbol,
    name:    context.name,
    sector:  context.sector,
    price:   context.currentPrice,
    stats: {
      retAnn:  +(context.stats.annualReturn * 100).toFixed(1),   // %
      volAnn:  +(context.stats.annualVol    * 100).toFixed(1),   // %
      sharpe:  +context.stats.sharpe.toFixed(2),
    },
    trend: {
      high1Y:     +context.priceTrend.high1Y.toFixed(2),
      low1Y:      +context.priceTrend.low1Y.toFixed(2),
      pctFrHigh:  +(context.priceTrend.pctFromHigh * 100).toFixed(1),
      pctFrLow:   +(context.priceTrend.pctFromLow  * 100).toFixed(1),
    },
    fundamentals: funds,
    // 3 headlines only — no body/url
    news: (context.news ?? []).slice(0, 3).map((n) => ({
      t: n.title,
      d: n.publishedAt?.slice(0, 10) ?? '',
    })),
  };
}

function injectDefaults(parsed: unknown, context: Context): unknown {
  if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    if (!obj.symbol) obj.symbol = context.symbol;
    // Always override generatedAt — never trust the model's date.
    obj.generatedAt = new Date().toISOString();
  }
  return parsed;
}

async function attemptNvidia(context: Context): Promise<Thesis & { tokenUsage?: object }> {
  const userContent = JSON.stringify(compactContext(context));

  const text = await nvidiaGenerate({
    systemPrompt: SYSTEM_PROMPT + SCHEMA_HINT,
    userPrompt: `Generate an investment thesis for:\n${userContent}`,
    temperature: 0.3,
  });

  const raw = JSON.parse(text) as Record<string, unknown>;
  raw.priceDropEvent = null;
  const parsed = injectDefaults(raw, context);
  return ThesisSchema.parse(parsed) as Thesis & { tokenUsage?: object };
}

export async function generateThesis(context: Context): Promise<Thesis & { tokenUsage?: object }> {
  if (!nvidiaAvailable()) {
    throw new Error('NVIDIA_API_KEY not set. Add it to run the thesis generator.');
  }
  return attemptNvidia(context);
}
