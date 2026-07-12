# PLAN-4 — Complete the v2 public API (stocks, news, compare) + README API reference

## Goal

`docs/v2-api-plan.md` specifies four public v2 endpoints. Only one exists. Currently
implemented: `/api/v2/thesis/[symbol]`, `/api/v2/keys`, plus extras (`backtest`,
`build-portfolio`, `portfolio-thesis`). **Missing** relative to the plan:

- `GET /api/v2/stocks/:symbol` — price + fundamentals in the v2 envelope
- `GET /api/v2/news/:symbol` — recent news (5 items)
- `GET /api/v2/compare?symbols=A,B` — up to 5 symbols
- README "API reference" section (plan item 7 — never written)

Ship these as thin wrappers over existing v1 logic, using the existing `v2ok`/`v2err`
envelope helpers and `resolveAuth`. This turns the half-shipped API-keys feature into
something a developer can actually use — right now a key only unlocks one data endpoint.

## Files to touch

| File | Change |
|---|---|
| `app/api/v2/stocks/[symbol]/route.ts` | **New** |
| `app/api/v2/news/[symbol]/route.ts` | **New** |
| `app/api/v2/compare/route.ts` | **New** |
| `README.md` | New "## API (v2)" section |

Reference files to read before coding (do not modify):
- `app/api/v2/thesis/[symbol]/route.ts` — the pattern to copy exactly (auth, tier headers, error mapping)
- `app/api/stocks/[symbol]/route.ts` — v1 stocks logic to wrap
- `app/api/news/[symbol]/route.ts` — v1 news logic to wrap
- `app/api/compare/route.ts` — v1 compare logic to wrap
- `lib/api/response.ts` — `v2ok(data, meta, headers?)` / `v2err(code, message, status)`
- `lib/api/auth.ts` — `resolveAuth`, `isAuthError`

## Implementation order

### Step 1 — `app/api/v2/stocks/[symbol]/route.ts`

Copy the structure of the v2 thesis route:
1. `await params` for the symbol (Next 16: `params` is a **Promise** — `{ params }: { params: Promise<{ symbol: string }> }`).
2. `normalizeTicker` → 400 `BAD_REQUEST` via `v2err` on `InvalidTickerError`.
3. **Nifty 50 gate**: same `isNifty50` check as thesis, EXCEPT index symbols: the v1 stocks
   route deliberately supports `^NSEI`/`^BSESN` (prices only, null fundamentals). Preserve
   that: allow `symbol.startsWith('^')` through the gate.
4. `resolveAuth(request)` → `v2err('UNAUTHORIZED', ...)` on `isAuthError`.
5. Fetch with the same cache keys as v1 — `stock:${symbol}:prices:1y` (TTL 3600) and
   `stock:${symbol}:fundamentals` (TTL 86400) via `cached()`, `normalizeFundamentals` for
   non-index symbols. **Reusing the same cache keys as v1 is intentional** — v1 and v2 share
   the cache, so a warm v1 cache serves v2 instantly.
6. Return `v2ok({ symbol, currency: 'INR', prices, fundamentals }, { cached, stale }, tierHeaders)`
   where `tierHeaders` are built exactly like the thesis route's `TIER_LIMITS` block —
   extract that block into a small local helper or copy it verbatim (do not import across
   route files; Next route files should not export non-route symbols).
7. Errors: `YahooFetchError` → `v2err('INTERNAL_ERROR', 'Failed to fetch stock data', 502)`.

### Step 2 — `app/api/v2/news/[symbol]/route.ts`

Read `app/api/news/[symbol]/route.ts` first and wrap whatever fetch function it uses
(`lib/data/news.ts` — `fetchMoneycontrolNews` or similar; use the same import and the same
cache key/TTL it uses). Same normalize/gate/auth scaffolding as Step 1 (indexes: news for
`^`-prefixed symbols is not meaningful — return 400 `BAD_REQUEST` for them, matching v1
behavior if v1 gates them; check v1 first and mirror it). Slice to 5 items:
`v2ok({ symbol, items: news.slice(0, 5) }, { cached, stale }, tierHeaders)`.

### Step 3 — `app/api/v2/compare/route.ts`

Query-param route (no dynamic segment):
1. `request.nextUrl.searchParams.get('symbols')` → split on `,`, trim, drop empties.
2. Validate: 2–5 symbols, each `normalizeTicker`'d and `isNifty50` (no index symbols here —
   covariance math needs equities; reject `^` with 400).
3. **Deduplicate after normalization** (`RELIANCE` and `reliance.ns` are the same symbol —
   duplicates break the covariance matrix in v1 too; dedupe then re-check count ≥ 2).
4. Reuse the v1 compare logic: read `app/api/compare/route.ts` and call the same underlying
   lib functions it calls (per-symbol price fetch + returns/correlation from `lib/data/returns.ts`)
   with the same cache keys. Do NOT fetch v1 over HTTP from v2 — call the library code.
5. `v2ok({ symbols, ...sameShapeAsV1Data }, { cached, stale }, tierHeaders)`.

### Step 4 — Middleware check (no change expected)

`middleware.ts` `AI_ROUTES = ['/api/thesis/', '/api/stress', '/api/v2/thesis/']` — the three
new routes are non-AI and correctly fall under the general API limiter. Verify you did NOT
add them to `AI_ROUTES`. (If PLAN-1 has landed, the same holds for its tier limiters.)

### Step 5 — README API reference

Add a `## API (v2)` section after "Environment variables" documenting: auth
(`X-API-Key: qe_live_...` header, keys created at `/portfolio/api-keys`), the envelope
(`{ok, data, meta}` / `{ok:false, error:{code,message}}`), rate limits per tier, and the four
endpoints with one `curl` example each, e.g.:

```bash
curl -H "X-API-Key: qe_live_..." https://stock-thesis-generator-mae5.vercel.app/api/v2/stocks/RELIANCE
```

Document honestly: Nifty 50 only; thesis endpoint may take 20–60s on cache miss; index
symbols supported on `/stocks` only.

### Step 6 — Verify

`npx tsc --noEmit`, `npm run build`, then with the dev server running:
- `curl localhost:3000/api/v2/stocks/RELIANCE` → `{"ok":true,...}` with prices + fundamentals
- `curl localhost:3000/api/v2/stocks/NIFTY` → 200, fundamentals all null
- `curl localhost:3000/api/v2/stocks/AAPL` → 400 BAD_REQUEST (not Nifty 50)
- `curl "localhost:3000/api/v2/compare?symbols=RELIANCE,TCS"` → 200
- `curl "localhost:3000/api/v2/compare?symbols=RELIANCE"` → 400 (need ≥2)
- `curl "localhost:3000/api/v2/compare?symbols=RELIANCE,reliance"` → 400 (dupes collapse to 1)
- `curl localhost:3000/api/v2/news/RELIANCE` → 200, ≤5 items

## Edge cases a weaker model would miss

- **Next 16 `params` is a Promise** — forgetting `await params` compiles in some configs and
  breaks at runtime. Copy the destructuring from the v2 thesis route verbatim.
- **Index symbols**: v1 stocks supports `^NSEI` with null fundamentals; a naive Nifty-50 gate
  on the v2 route would regress that. Compare needs the opposite: indexes must be rejected.
- **Same-cache-key reuse** is deliberate; inventing `v2:` cache keys would double Yahoo traffic
  and let v1/v2 serve different data for the same symbol.
- **Do not import helpers between route files** — Next route modules must only export HTTP
  method handlers and route-segment config; a stray `export const TIER_LIMITS` in a route file
  imported elsewhere breaks the build. Duplicate the tiny tier table or put it in `lib/api/`.
- **Dedup before count validation** in compare, not after — otherwise `RELIANCE,RELIANCE`
  passes the 2-symbol check and produces a singular covariance matrix downstream.
- **`fetchPrices` has a `.BO` retry fallback** on empty results ([yahoo.ts:58](lib/data/yahoo.ts)) —
  it can take 2+ extra seconds. Don't add aggressive timeouts around it.
- **News source is scraped/RSS** (`lib/data/news.ts`) — it can legitimately return `[]`. An
  empty array is a valid 200 response, not an error.

## Acceptance criteria

1. `npx tsc --noEmit` clean; `npm run build` succeeds; `npm test` still green.
2. All seven curl checks in Step 6 return exactly the described status codes and shapes.
3. Every v2 response (success and error) has the `{ok, data|error, meta?}` envelope with
   `meta.requestId` present on successes.
4. `X-RateLimit-Tier` header present on all three new routes for keyed and anonymous requests.
5. README section renders correctly on GitHub (check the code fences) and every documented
   curl example works against the local dev server.
6. No changes to any v1 route file, `middleware.ts`, or `lib/` (except an optional new
   `lib/api/tiers.ts` if you chose extraction over duplication).
