/**
 * Shared SWR fetchers — the one client-side data pattern for this app.
 *
 * Client components fetch with `useSWR(key, fetcher)`. Keys that depend on the
 * auth token are passed as `[url, token]` tuples so SWR refetches on login and
 * dedupes per token. Never fetch in a bare useEffect + useState.
 */

export class FetchError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
  }
}

/** Plain GET → JSON. Throws FetchError on non-2xx. */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new FetchError(`Request failed (HTTP ${res.status})`, res.status);
  return res.json() as Promise<T>;
}

/** Authed GET → JSON. Key is a `[url, token]` tuple. Throws on non-2xx. */
export async function authedFetcher<T = unknown>([url, token]: [string, string]): Promise<T> {
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new FetchError(`Request failed (HTTP ${res.status})`, res.status);
  return res.json() as Promise<T>;
}
