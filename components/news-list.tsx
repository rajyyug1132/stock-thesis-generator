import { formatDistanceToNow, parseISO } from 'date-fns';

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  snippet: string;
}

interface NewsListProps {
  items: NewsItem[];
}

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n) + '…';
}

export function NewsList({ items }: NewsListProps) {
  if (!items || items.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-2">No recent news indexed.</p>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {items.map((item, i) => (
        <li key={i} className="py-4 first:pt-0 last:pb-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
              {item.title}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {item.source} · {timeAgo(item.publishedAt)}
            </p>
            {item.snippet && (
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {truncate(item.snippet, 160)}
              </p>
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}
