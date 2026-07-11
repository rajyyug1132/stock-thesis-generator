/**
 * Annotation Layer — Epic A
 *
 * Each annotation pins a catalyst event to a timestamp + price.
 * The `sourceUrl` links to the verifying article so users can audit
 * every data-bound label (the "Moat" principle).
 */

export interface ChartAnnotation {
  /** ISO date string matching the price-series date key (YYYY-MM-DD) */
  timestamp: string;
  /** Price at which this event is pinned (for Y-axis placement) */
  price: number;
  /** Short label shown directly on the chart */
  label: string;
  /** One-sentence news headline / catalyst description shown in the tooltip */
  catalyst: string;
  /** Canonical source URL for the evidence drawer */
  sourceUrl: string;
  /** Optional severity affects pin colour: 'positive' | 'negative' | 'neutral' */
  sentiment?: 'positive' | 'negative' | 'neutral';
}

/**
 * Seed annotations keyed by ticker symbol.
 * In production these would be hydrated from the thesis API
 * (the `priceDropEvent` field already extracted from the response).
 */
export const ANNOTATIONS: Record<string, ChartAnnotation[]> = {
  RELIANCE: [
    {
      timestamp: '2024-07-25',
      price: 2948.5,
      label: 'Q1 Miss',
      catalyst: 'Reliance Industries Q1 FY25 net profit fell 5.5% YoY, missing consensus by ~4%, on margin compression in O2C.',
      sourceUrl: 'https://www.moneycontrol.com/news/business/earnings/reliance-industries-q1-fy25-results',
      sentiment: 'negative',
    },
    {
      timestamp: '2024-10-14',
      price: 2765.0,
      label: 'Jio Tariff Hike',
      catalyst: 'Jio announced 10-25% mobile tariff increases effective October 2024, boosting ARPU outlook.',
      sourceUrl: 'https://economictimes.indiatimes.com/tech/technology/jio-announces-tariff-hike',
      sentiment: 'positive',
    },
  ],
  TCS: [
    {
      timestamp: '2024-04-19',
      price: 3742.0,
      label: 'Weak Guidance',
      catalyst: 'TCS Q4 FY24 revenue growth of 3.5% CC missed estimates; management flagged softness in BFSI vertical.',
      sourceUrl: 'https://www.livemint.com/companies/company-results/tcs-q4-results-2024',
      sentiment: 'negative',
    },
    {
      timestamp: '2024-09-10',
      price: 4215.0,
      label: 'BSNL Deal',
      catalyst: 'TCS and BSNL signed a ₹15,000 Cr 4G/5G network deal — the largest domestic IT contract of FY25.',
      sourceUrl: 'https://economictimes.indiatimes.com/tech/information-tech/tcs-bsnl-deal-2024',
      sentiment: 'positive',
    },
  ],
  INFY: [
    {
      timestamp: '2024-07-18',
      price: 1612.0,
      label: 'Guidance Raise',
      catalyst: 'Infosys raised FY25 CC revenue guidance to 3-4% from 1-3% after strong large-deal TCV of $4.1 Bn in Q1.',
      sourceUrl: 'https://www.infosys.com/investors/reports-filings/quarterly-results/2025/q1.html',
      sentiment: 'positive',
    },
  ],
  HDFCBANK: [
    {
      timestamp: '2024-01-16',
      price: 1598.0,
      label: 'NIM Compression',
      catalyst: 'HDFC Bank Q3 NIM fell to 3.4% from 3.6% QoQ post-HDFC merger integration, triggering a 9% single-day drop.',
      sourceUrl: 'https://www.moneycontrol.com/news/business/earnings/hdfc-bank-q3-results-2024',
      sentiment: 'negative',
    },
  ],
  WIPRO: [
    {
      timestamp: '2024-10-17',
      price: 548.0,
      label: 'Q2 Beat',
      catalyst: 'Wipro Q2 FY25 IT services revenue grew 1.3% QoQ, ahead of the guided 0.5-1.5% band; margins expanded 80 bps.',
      sourceUrl: 'https://www.wipro.com/investors/quarterly-reports/',
      sentiment: 'positive',
    },
  ],
};

/** Helper — look up annotations for a ticker, returning [] if none found. */
export function getAnnotations(symbol: string): ChartAnnotation[] {
  // Try exact match first, then uppercase
  return ANNOTATIONS[symbol] ?? ANNOTATIONS[symbol.toUpperCase()] ?? [];
}
