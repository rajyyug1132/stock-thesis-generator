# How It's Built

## The core idea

The architecture has three distinct layers and I kept them deliberately separate: a data layer that talks to Yahoo Finance, an AI layer that talks to Gemini (and fallback providers), and a presentation layer that only ever talks to my own API routes. The frontend never calls Yahoo Finance or Gemini directly. It doesn't know those exist.

I made that call early and it was the right one. API keys need to live on the server. But beyond security, keeping the layers separate also means I can swap out the data source or the AI provider without touching the frontend. I already had to do this when Gemini's free quota kept running out — being able to add DeepSeek and then OpenRouter as fallbacks without changing anything in the React components was worth the upfront structure.

## System diagram

```
Browser
  │
  ├─ GET /stock/RELIANCE  (Next.js Server Component, ISR)
  │     │
  │     └─ calls /api/thesis/RELIANCE  (same server, server-to-self)
  │           │
  │           ├─ Upstash Redis  ←─ cache hit? return cached thesis
  │           │
  │           ├─ lib/ai/context.ts
  │           │     ├─ fetchPrices()   → Yahoo Finance (yahoo-finance2)
  │           │     └─ fetchFundamentals() → Yahoo Finance
  │           │
  │           ├─ lib/ai/thesis.ts  (generateThesis)
  │           │     └─ Gemini 2.5 Pro
  │           │         └─ quota? → Flash 2.5 → Flash 2.0 → DeepSeek → OpenRouter → Groq
  │           │
  │           └─ lib/ai/validate.ts  (validateThesis)
  │                 └─ Gemini Flash → same cascade
  │
  ├─ GET /compare?symbols=RELIANCE,TCS,INFY  (Next.js Server Component)
  │     ├─ /api/compare  → Yahoo Finance (price + fundamentals for all symbols)
  │     └─ /api/covariance  → computes log-return covariance matrix
  │
  └─ Client interactions
        ├─ Conviction slider, Evidence Drawer  (React state, no API calls)
        ├─ Portfolio simulation  →  Web Worker (simulation.worker.ts)
        │     └─ runSimulation()  →  Cholesky decomp + GBM + risk metrics
        │                              (Float64Arrays, zero-copy transfer)
        ├─ Stress test  →  /api/stress  →  Gemini Flash  →  second Worker run
        └─ Ticker strip  →  ticker.worker.ts  (GBM price simulation, 600ms ticks)
```

---

## Breaking it down

### Next.js App Router frontend

The frontend handles rendering and user interaction. It deliberately doesn't handle any external data fetching — that all goes through the route handlers in `/app/api/`.

The stock page (`/app/stock/[symbol]/page.tsx`) is a Server Component. It calls `/api/thesis/[symbol]` server-to-server at build/render time. The 6 featured stocks are pre-rendered at build time via `generateStaticParams`. Everything else is ISR — the page is cached at the edge and revalidated every hour.

The interactive parts (evidence drawer, conviction slider, stress test) are Client Components that receive the thesis data as props and manage local state. No data fetching happens client-side except for the stress test, which needs to send a user query to `/api/stress`.

### Route handlers (`/app/api/`)

These are Vercel serverless functions. The main ones:

**`/api/thesis/[symbol]`** — the core endpoint.
1. Validates and normalizes the ticker (must be a Nifty 50 symbol)
2. Checks Redis cache (`thesis:${symbol}:v3`, 1hr TTL)
3. On cache miss: calls `buildContext()` to fetch prices + fundamentals in parallel
4. Calls `generateThesis(context)` with the AI cascade
5. Calls `validateThesis(thesis, context)` to run the verification pass
6. Stores result in Redis, returns JSON with thesis, validation, and key metrics

**`/api/stocks/[symbol]`** — just the market data, no AI. Used by the stock grid on the home page.

**`/api/compare`** — fetches and aligns price history for multiple symbols, computes return stats and correlation matrix.

**`/api/covariance`** — returns the covariance matrix input needed for the Monte Carlo simulation.

**`/api/stress`** — accepts a natural-language query and a list of symbols, calls Gemini Flash to parse the query into a `ShockSpec` (which symbols get hit, by how much, on which parameters), returns it to the client. The client then applies the spec locally and runs a second simulation in the worker.

**`/app/api/v2/thesis/[symbol]`** — same logic as the v1 thesis route but wrapped in a consistent JSON envelope with auth (`X-API-Key` or `Authorization: Bearer`) and rate limit headers. For external API consumers.

### Yahoo Finance data layer (`/lib/data/yahoo.ts`)

I'm using `yahoo-finance2`, a JavaScript npm package, not Python's yfinance. The `.NS` suffix is what makes a ticker resolve to NSE — `RELIANCE.NS` instead of just `RELIANCE`.

For each ticker I fetch two things:

**Prices** (`fetchPrices`): 1 year of daily OHLCV via the `historical` endpoint. I store only close and volume. If Yahoo returns an empty array (which happens under rate limiting), there's a fallback that waits 2 seconds and retries with the `.BO` (BSE) suffix.

**Fundamentals** (`fetchFundamentals`): I call `quoteSummary` with four modules — `price`, `summaryDetail`, `financialData`, `defaultKeyStatistics`. What I extract: P/E ratio (trailing), P/B ratio, ROE, debt/equity, dividend yield, market cap. Yahoo's response shape is inconsistent between tickers, so there's a `toNumber()` guard that strips out "N/A" strings and other non-numeric values that Yahoo sometimes returns for missing fields. Missing fields come back as `null`, not as errors.

**What I don't fetch that the app doesn't have:** margins and revenue growth. I originally planned to include them but Yahoo Finance's revenue data requires a different module and the response format varies significantly. The thesis prompt works fine without them — the model uses what it's given.

### AI layer (`/lib/ai/`)

**Context building** (`context.ts`): Assembles the full context object from the price history and fundamentals. Computes annualized return, volatility, and Sharpe ratio from 1Y daily log returns. Adds 1Y high/low and % from high/low. Fetches recent news headlines. This is everything the AI gets.

**Thesis generation** (`thesis.ts`): The cascade tries providers in order. Gemini 2.5 Pro is first — it uses `responseMimeType: 'application/json'` with a `responseSchema` that enforces the exact structure. If it hits quota, it falls through to Flash 2.5, then Flash 2.0 (different quota pool), then DeepSeek, then OpenRouter (free Gemini 2.0 Flash or Llama 3.3 70B), then Groq. The fallback providers don't get structured output enforcement, so they get a compact JSON schema in the system prompt instead and I validate with Zod after parsing.

The system prompt has one key instruction: every `evidence` field must cite a specific number from the provided JSON. "Strong fundamentals" is not allowed. "P/E of 24.3" is.

**Verification** (`validate.ts`): A separate AI call that takes the thesis and the source context, extracts all the `evidence` fields, and checks each one against the data. Returns a list of claims with `verified: true/false` and a reason. The same cascade applies. This is what produces the grounding score.

**Simulation** (`/lib/sim/`): Full correlated GBM Monte Carlo running in a Web Worker. Cholesky decomposition of the covariance matrix to generate correlated normals. Pre-allocated Float64Arrays for the hot loop. The worker transfers buffer ownership back to the main thread zero-copy. 5,000 paths by default on the compare page.

### Redis caching and rate limiting

Caching is in `lib/cache/redis.ts`. The `cached()` helper handles cache-aside pattern with stale-while-revalidate. If Redis is unavailable (no env vars set), it falls back to an in-memory Map — useful for local development.

TTLs: prices 1hr, fundamentals 24hr, thesis 1hr.

Rate limiting is in `middleware.ts`. Sliding window via @upstash/ratelimit. AI routes (thesis, stress) get tighter limits (10/min per IP) than other API routes (60/min). API key holders get higher limits than anonymous users.

### Database

Supabase Postgres via Drizzle ORM. Tables:
- `simulation_snapshots` — saved portfolio configurations with metrics
- `watchlist` — per-user stock watchlist
- `price_alerts` — per-user price triggers with direction (above/below) and target price
- `api_keys` — developer API keys (SHA-256 hash stored, never the raw key)

Migrations are in `/drizzle/` and managed with `drizzle-kit push`.

---

## Security decisions

API keys (Gemini, Groq, Supabase service role) never leave the server. All external API calls go through route handlers. The client bundle has no credentials in it.

The only client-visible Supabase credentials are the anon key and public URL, which are safe to expose by design — they're scoped to public RLS policies.

CORS is handled at the middleware level. Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) are set in `next.config.ts` for all routes.

For the developer API, keys are stored as SHA-256 hashes. The raw key is returned once at creation and never stored. Revocation flips a `revoked` boolean — no deletes, for auditability.

---

## If I were rebuilding this

I'd separate the data fetching from the AI context building earlier. Right now `buildContext()` in `lib/ai/context.ts` lives in the AI directory even though most of what it does is just data fetching and stat computation. It works but the naming is slightly misleading.

I'd also think harder about the Gemini quota problem from day one. The cascading fallback setup works but it took several debugging sessions to get right — the different providers have different token limits, different rate limit error shapes, and different JSON output reliability. If I were doing this again I'd probably pick one reliable provider with a paid tier from the start rather than building a five-provider fallback chain over free tiers.

The Web Worker setup for the simulation is good and I'd keep that. Running 5,000 Monte Carlo paths on the main thread would freeze the UI for 1-2 seconds — moving it off-thread was the right call.

---

## Known gaps

These are things described in early planning docs that aren't reflected in the current code:

- **No `pbRatio` or `dividendYield` shown in the thesis context metrics panel** on the stock page — they're fetched and stored but the UI only renders P/E, ROE, D/E, volatility, Sharpe, and 1Y high. The thesis generator does have access to all fetched fields.
- **Margins and revenue growth** were mentioned in early design docs but are not fetched. The `fetchFundamentals()` function does not include them.
- **`AlertSetup` component** (`components/notifications/alert-setup.tsx`) exists and works but isn't yet integrated into the individual stock pages — it's only accessible from the watchlist page at `/portfolio/watchlist`.
