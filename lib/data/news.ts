import YahooFinanceCtor from 'yahoo-finance2';
import { XMLParser } from 'fast-xml-parser';
import { getName } from './nifty50';

const YahooFinance = new (YahooFinanceCtor as unknown as new () => {
  search: (query: string) => Promise<unknown>;
})();

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  snippet: string;
}

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function isRecent(iso: string): boolean {
  const t = Date.parse(iso);
  if (isNaN(t)) return false;
  return Date.now() - t < FOURTEEN_DAYS_MS;
}

export async function fetchNews(symbol: string, limit = 8): Promise<NewsItem[]> {
  // Primary: Yahoo search
  const primary = await fetchYahooNews(symbol, limit);
  if (primary.length > 0) return primary;

  // Fallback: Moneycontrol RSS
  return fetchMoneycontrolNews(symbol, limit);
}

async function fetchYahooNews(symbol: string, limit: number): Promise<NewsItem[]> {
  try {
    // Search by company name when available (better results for Indian tickers)
    const companyName = getName(symbol);
    const queries: string[] = [];
    if (companyName) queries.push(companyName);
    queries.push(symbol);

    const seen = new Set<string>();
    const all: NewsItem[] = [];

    for (const q of queries) {
      const result = (await YahooFinance.search(q)) as {
        news?: Array<{
          title?: string;
          link?: string;
          publisher?: string;
          providerPublishTime?: number | string;
          relatedTickers?: string[];
        }>;
      };

      const rawNews = result?.news ?? [];

      for (const n of rawNews) {
        if (!n.title || !n.link || seen.has(n.link)) continue;
        // Accept: relatedTickers match OR company name appears in title
        const titleLower = n.title.toLowerCase();
        const nameLower = (companyName ?? '').toLowerCase();
        const tickerMatch = n.relatedTickers?.includes(symbol) ?? false;
        const nameMatch = nameLower.length > 0 && titleLower.includes(nameLower);
        if (!tickerMatch && !nameMatch) continue;

        let publishedAt: string;
        if (typeof n.providerPublishTime === 'number') {
          publishedAt = new Date(n.providerPublishTime * 1000).toISOString();
        } else if (typeof n.providerPublishTime === 'string') {
          publishedAt = new Date(n.providerPublishTime).toISOString();
        } else {
          publishedAt = new Date().toISOString();
        }

        if (!isRecent(publishedAt)) continue;

        seen.add(n.link);
        all.push({
          title: stripHtml(n.title),
          url: n.link,
          source: n.publisher ?? 'Yahoo',
          publishedAt,
          snippet: '',
        });

        if (all.length >= limit) return all;
      }
    }

    return all;
  } catch {
    return [];
  }
}

async function fetchMoneycontrolNews(
  symbol: string,
  limit: number
): Promise<NewsItem[]> {
  try {
    const companyName = getName(symbol);
    if (!companyName) return [];

    const resp = await fetch('https://www.moneycontrol.com/rss/marketreports.xml', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!resp.ok) return [];

    const xml = await resp.text();
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml) as {
      rss?: { channel?: { item?: Array<Record<string, unknown>> } };
    };

    const rawItems = parsed.rss?.channel?.item ?? [];
    const nameLower = companyName.toLowerCase();

    const items: NewsItem[] = rawItems
      .filter((it) => {
        const title = String(it.title ?? '').toLowerCase();
        return title.includes(nameLower);
      })
      .map((it) => ({
        title: stripHtml(String(it.title ?? '')),
        url: String(it.link ?? ''),
        source: 'Moneycontrol',
        publishedAt: it.pubDate
          ? new Date(String(it.pubDate)).toISOString()
          : new Date().toISOString(),
        snippet: stripHtml(String(it.description ?? '')).slice(0, 280),
      }))
      .filter((n) => isRecent(n.publishedAt))
      .slice(0, limit);

    return items;
  } catch {
    return [];
  }
}
