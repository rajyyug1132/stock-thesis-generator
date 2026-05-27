'use client';

import { useEffect, useState } from 'react';
import type { WatchlistItem } from '@/lib/db/schema';
import type { NewsItem } from '@/lib/data/news';

interface NewsDigestItem extends NewsItem {
  symbol: string;
}

interface NewsDigestProps {
  watchlist: WatchlistItem[];
}

export function NewsDigest({ watchlist }: NewsDigestProps) {
  const [items, setItems]       = useState<NewsDigestItem[]>([]);
  const [loading, setLoading]   = useState(false);
  const [fetched, setFetched]   = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!watchlist.length) return;
    const newSymbols = watchlist
      .map((w) => w.symbol)
      .filter((s) => !fetched.has(s));
    if (!newSymbols.length) return;

    setLoading(true);
    setFetched((prev) => new Set([...prev, ...newSymbols]));

    Promise.allSettled(
      newSymbols.map((symbol) =>
        fetch(`/api/news/${encodeURIComponent(symbol)}`)
          .then((r) => r.json())
          .then((d) => ({ symbol, items: d.items ?? [] as NewsItem[] }))
      )
    ).then((results) => {
      const newItems: NewsDigestItem[] = [];
      for (const r of results) {
        if (r.status === 'fulfilled') {
          const { symbol, items: newsItems } = r.value;
          for (const item of newsItems as NewsItem[]) {
            newItems.push({ ...item, symbol });
          }
        }
      }
      // Sort by publishedAt descending
      newItems.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
      setItems((prev) => {
        const existingUrls = new Set(prev.map((i) => i.url));
        const fresh = newItems.filter((i) => !existingUrls.has(i.url));
        return [...prev, ...fresh].sort(
          (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
        );
      });
      setLoading(false);
    });
  }, [watchlist, fetched]);

  if (!watchlist.length) {
    return (
      <div
        style={{
          padding:   '2rem',
          textAlign: 'center',
          color:     'var(--text-tertiary)',
          fontSize:  13,
          border:    '1px dashed var(--border-subtle)',
        }}
      >
        Add stocks to your watchlist to see a personalised news digest here.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {loading && items.length === 0 && (
        <div style={{ padding: '1rem', color: 'var(--text-tertiary)', fontSize: 13 }}>
          Loading news…
        </div>
      )}

      {items.slice(0, 30).map((item, i) => (
        <a
          key={item.url}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display:        'flex',
            flexDirection:  'column',
            gap:            4,
            padding:        '0.875rem 1rem',
            borderBottom:   i < items.length - 1 ? '1px solid var(--border-grid)' : 'none',
            textDecoration: 'none',
            transition:     'background 0.1s',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--bone-faint)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.625rem' }}>
            <span
              style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      9,
                letterSpacing: '0.15em',
                color:         'var(--mint)',
                border:        '1px solid var(--mint)',
                padding:       '1px 5px',
                whiteSpace:    'nowrap',
              }}
            >
              {item.symbol.replace('.NS', '')}
            </span>
            <span
              style={{
                fontSize:   13,
                color:      'var(--text-primary)',
                lineHeight: 1.4,
                fontWeight: 500,
              }}
            >
              {item.title}
            </span>
          </div>
          <div
            style={{
              display:    'flex',
              gap:        '0.5rem',
              fontSize:   11,
              color:      'var(--text-tertiary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <span>{item.source}</span>
            <span>·</span>
            <span>{formatAge(item.publishedAt)}</span>
          </div>
        </a>
      ))}

      {items.length === 0 && !loading && (
        <div
          style={{
            padding:   '1.5rem',
            textAlign: 'center',
            color:     'var(--text-tertiary)',
            fontSize:  13,
          }}
        >
          No recent news found for your watchlist.
        </div>
      )}
    </div>
  );
}

function formatAge(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (isNaN(ms)) return '';
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
