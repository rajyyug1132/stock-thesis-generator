/**
 * StockRAG filing-evidence client. Calls an external RAG API (StockRAG on HF
 * Spaces) for citation-backed answers over a company's SEC / annual-report
 * filings. Degrades to null on any failure — the evidence section just hides,
 * same graceful pattern as lib/data/news.ts.
 */

const RAG_REFUSAL = "I don't have enough information in the retrieved filings to answer this.";
const EVIDENCE_QUESTION =
  'What are the most significant risk factors and business developments disclosed in the filings?';

export interface EvidenceSource {
  index: number;
  form: string;
  filing_date: string;
  section: string;
  accession: string;
}

export interface Evidence {
  answer: string;
  sources: EvidenceSource[];
}

export function ragAvailable(): boolean {
  return !!process.env.STOCKRAG_API_URL;
}

export async function fetchEvidence(symbol: string): Promise<Evidence | null> {
  const base = process.env.STOCKRAG_API_URL;
  if (!base) return null;
  try {
    const res = await fetch(`${base}/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: EVIDENCE_QUESTION, ticker: symbol }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Evidence;
    // Ticker not ingested → RAG refuses; treat as "no evidence".
    if (!data.answer || data.answer.trim() === RAG_REFUSAL) return null;
    return data;
  } catch {
    return null;
  }
}
