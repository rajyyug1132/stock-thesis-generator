/* Mock dataset for the Editorial Quant prototype. Approximates the shapes
   returned by /api/stocks/[symbol] and /api/thesis/[symbol] in the source repo. */

window.NIFTY = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd.',   sector: 'OIL & GAS' },
  { symbol: 'TCS.NS',      name: 'Tata Consultancy Services',  sector: 'IT' },
  { symbol: 'INFY.NS',     name: 'Infosys Ltd.',               sector: 'IT' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd.',             sector: 'BFSI' },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors Ltd.',         sector: 'AUTO' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd.',           sector: 'BFSI' },
  { symbol: 'ITC.NS',      name: 'ITC Ltd.',                   sector: 'FMCG' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel Ltd.',       sector: 'TELECOM' },
  { symbol: 'SBIN.NS',     name: 'State Bank of India',        sector: 'BFSI' },
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever Ltd.',  sector: 'FMCG' },
  { symbol: 'LT.NS',       name: 'Larsen & Toubro Ltd.',       sector: 'INFRA' },
  { symbol: 'ASIANPAINT.NS', name: 'Asian Paints Ltd.',        sector: 'CONSUMER' },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank',       sector: 'BFSI' },
  { symbol: 'TITAN.NS',    name: 'Titan Company Ltd.',         sector: 'CONSUMER' },
  { symbol: 'MARUTI.NS',   name: 'Maruti Suzuki India Ltd.',   sector: 'AUTO' },
];

/* Build a synthetic weekly series biased upward for bullish examples,
   downward for the bearish ones. */
function series(seed, n, drift, vol) {
  const out = [];
  let v = 100;
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280 - 0.5;
    v *= 1 + drift + r * vol;
    out.push(+v.toFixed(2));
  }
  return out;
}

window.PRICES = {
  'RELIANCE':   series(7,  52, 0.009, 0.035),  // bullish
  'TCS':        series(11, 52, 0.005, 0.028),
  'INFY':       series(3,  52, 0.004, 0.030),
  'HDFCBANK':   series(31, 52, 0.003, 0.024),
  'TATAMOTORS': series(17, 52, -0.001, 0.045), // bearish
  'ICICIBANK':  series(23, 52, 0.007, 0.030),
  'ITC':        series(41, 52, 0.002, 0.020),
  'BHARTIARTL': series(13, 52, 0.011, 0.034),
  'SBIN':       series(19, 52, 0.006, 0.038),
  'HINDUNILVR': series(29, 52, 0.000, 0.022),
  'LT':         series(37, 52, 0.008, 0.030),
  'ASIANPAINT': series(43, 52, -0.003, 0.028),
  'KOTAKBANK':  series(47, 52, 0.002, 0.025),
  'TITAN':      series(53, 52, 0.010, 0.040),
  'MARUTI':     series(59, 52, 0.004, 0.032),
};

window.FUNDAMENTALS = {
  'RELIANCE':   { peRatio: 24.3, roe: 0.181, debtToEquity: 0.42, annualVol: 0.24, sharpe: 1.24, marketCap: 1.92e13, currentPrice: 3184.20 },
  'TCS':        { peRatio: 28.7, roe: 0.422, debtToEquity: 0.08, annualVol: 0.18, sharpe: 0.81, marketCap: 1.42e13, currentPrice: 3892.50 },
  'INFY':       { peRatio: 24.8, roe: 0.314, debtToEquity: 0.10, annualVol: 0.21, sharpe: 0.62, marketCap: 7.21e12, currentPrice: 1742.30 },
  'HDFCBANK':   { peRatio: 19.2, roe: 0.165, debtToEquity: 1.18, annualVol: 0.19, sharpe: 0.42, marketCap: 1.18e13, currentPrice: 1582.10 },
  'TATAMOTORS': { peRatio: 18.4, roe: 0.142, debtToEquity: 1.32, annualVol: 0.42, sharpe: -0.18, marketCap: 2.71e12, currentPrice: 742.10 },
  'ICICIBANK':  { peRatio: 17.8, roe: 0.184, debtToEquity: 0.97, annualVol: 0.20, sharpe: 1.02, marketCap: 8.34e12, currentPrice: 1187.40 },
  'ITC':        { peRatio: 26.4, roe: 0.281, debtToEquity: 0.00, annualVol: 0.17, sharpe: 0.34, marketCap: 5.91e12, currentPrice: 472.80 },
  'BHARTIARTL': { peRatio: 64.2, roe: 0.158, debtToEquity: 1.84, annualVol: 0.26, sharpe: 1.42, marketCap: 8.91e12, currentPrice: 1592.40 },
};

/* A grounded thesis, in the same shape as the Gemini Pro output */
window.THESIS = {
  symbol: 'RELIANCE.NS',
  generatedAt: '2026-05-14T08:00:00.000Z',
  groundingScore: 0.92,
  summary: "Reliance trades at a 24× P/E despite Jio Platforms' 18% YoY ARPU growth and a maturing retail vertical that now contributes ₹76,627Cr in annual revenue — a multi-vertical compounder hiding behind an oil-major's ticker.",
  bullCase: {
    headline: 'Multi-vertical compounder hiding behind an oil-major ticker.',
    points: [
      { claim: "Jio Platforms' ARPU grew 18% YoY in FY24, with subscriber base expanding to 470M.", evidence: "Q4FY24 earnings deck, slide 12; ARPU ₹181.70 → ₹213.30; net adds +12.1M.", verified: true,  reason: "Confirmed against Reliance Q4FY24 investor presentation." },
      { claim: "Retail segment revenue ₹76,627Cr in FY24, up 18.2% YoY with a 23M store visits.", evidence: "FY24 annual report, retail revenue ₹76,627Cr vs ₹64,807Cr FY23.", verified: true, reason: "Cross-checked against Yahoo Finance fundamentals snapshot." },
      { claim: "Net debt fell from ₹2.91L Cr (FY23) to ₹2.14L Cr (FY24) after rights issue and asset monetisation.", evidence: "Balance-sheet line items; cash & equivalents ₹73,401Cr.", verified: true, reason: "Matches FY24 audited balance sheet." },
      { claim: "New-energy capex committed ₹75,000Cr through FY28 — vertical gigafactory + electrolyser.", evidence: "FY24 capex guidance; first gigafactory commissioning Q3 FY26.", verified: false, reason: "Forward-looking; cannot verify against historical filing." },
    ],
  },
  bearCase: {
    headline: 'Refining margin compression and capex-heavy energy bet.',
    points: [
      { claim: "GRM compressed to $9.30/bbl from $12.10/bbl QoQ on weak Asian crack spreads.", evidence: "Q4FY24 segment results; reported GRM $9.30/bbl.", verified: false, reason: "Quarterly GRM not in Yahoo Finance fundamentals API." },
      { claim: "Capex intensity at ₹1.42L Cr in FY24 limits dividend uplift for the next 3 fiscals.", evidence: "Cash-flow statement; capex/revenue = 14.8%.", verified: true, reason: "Confirmed against FY24 cash-flow statement." },
      { claim: "Regulatory overhang on Jio tariffs — TRAI consultation paper Mar 2026.", evidence: "TRAI CP No. 04/2026; floor-tariff discussion ongoing.", verified: false, reason: "External regulatory document; not in our data sources." },
    ],
  },
  risks: [
    { severity: 'high',   risk: 'Crude price volatility — refining segment is 38% of FY24 EBITDA.' },
    { severity: 'medium', risk: 'Telecom tariff cap risk if TRAI imposes floor pricing.' },
    { severity: 'medium', risk: 'Retail SSSG slowed to 7% in H2 FY24 vs 14% H1.' },
    { severity: 'low',    risk: 'FX exposure on debt — 28% of debt is USD-denominated.' },
  ],
  catalysts: [
    { event: 'Jio listing / IPO',                   timeframe: 'FY26-Q3', impact: 'positive' },
    { event: 'New-energy gigafactory commissioning', timeframe: 'FY26-Q4', impact: 'positive' },
    { event: 'TRAI tariff-floor decision',           timeframe: 'FY26-Q2', impact: 'mixed'    },
    { event: 'Brent crude rebalancing on OPEC+ cut', timeframe: 'FY26-Q3', impact: 'negative' },
  ],
};

window.NIFTY_LIVE = { level: 24837.10, change: 0.0042 };
