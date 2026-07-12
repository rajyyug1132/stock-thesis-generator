# PLAN-5 — Data completeness indicator + fundamentals zero-value fixes

## Goal

Two documented gaps plus two latent bugs, all in the same data path:

1. **`docs/ARCHITECTURE.md` "Known Gaps"**: pbRatio and dividendYield are fetched from Yahoo
   and cached, but never shown anywhere on the stock page. The README's "What I'd build next"
   also asks for a **data completeness indicator** — "surface a data completeness indicator
   upfront so you know how much the thesis had to work with."
2. **Zero-value bug in [lib/data/yahoo.ts:113](lib/data/yahoo.ts)**:
   `financialData.debtToEquity ? toNumber(financialData.debtToEquity / 100) : null` — a
   debt-free company with D/E exactly `0` gets `null` ("no data") instead of `0`. Same class
   of bug at line 109: `price.marketCap || summaryDetail.marketCap` uses `||`, so a `0` in
   the first source falls through (harmless for marketCap in practice, but fix the pattern
   while touching the line).

Deliver: fix the falsy-zero bugs, add pbRatio + dividendYield rows to the stock page
fundamentals panel, and add a "DATA n/6" completeness pill computed from the six
fundamentals fields.

## Files to touch

| File | Change |
|---|---|
| `lib/data/yahoo.ts` | `??`-based extraction; explicit `debtToEquity === null` handling |
| `lib/ai/context.ts` | Pass `pbRatio` + `dividendYield` through `keyMetrics` (read it first — see Step 3) |
| `app/api/thesis/[symbol]/route.ts` | Add `pbRatio`, `dividendYield` to the `keyMetrics` object it returns |
| `app/stock/[symbol]/page.tsx` | Two new `DataRow`s; completeness pill; extend local `KeyMetrics` interface |
| `lib/data/completeness.ts` | **New** — tiny pure function + type |
| `lib/data/completeness.test.ts` | **New** — unit tests |

## Implementation order

### Step 1 — `lib/data/yahoo.ts` extraction fixes

In `fetchFundamentals`:
```ts
const marketCap = toNumber(price.marketCap ?? summaryDetail.marketCap);
const rawDte = toNumber(financialData.debtToEquity);
const debtToEquity = rawDte === null ? null : rawDte / 100;
```
Leave `toNumber` itself as is (it already maps strings like "N/A" to null). Do not change
`peRatio`, `pbRatio`, `roe`, `dividendYield` lines — they already use `toNumber` directly
without the falsy trap.

Caveat on `??` vs `||` for marketCap: Yahoo's `price.marketCap` can be present-but-zero in
odd cases; with `??` a real `0` no longer falls through to `summaryDetail.marketCap`. That
is the correct semantic (0 is data, not absence).

### Step 2 — `lib/data/completeness.ts`

```ts
import type { Fundamentals } from './types';

export const FUNDAMENTAL_FIELDS = ['marketCap', 'peRatio', 'pbRatio', 'roe', 'debtToEquity', 'dividendYield'] as const;

export interface Completeness { present: number; total: number; missing: string[]; }

export function fundamentalsCompleteness(f: Fundamentals): Completeness {
  const missing = FUNDAMENTAL_FIELDS.filter((k) => f[k] === null || f[k] === undefined);
  return { present: FUNDAMENTAL_FIELDS.length - missing.length, total: FUNDAMENTAL_FIELDS.length, missing: [...missing] };
}
```
Key detail: the check is `=== null || === undefined` — **`0` counts as present** (that's the
whole point of Step 1).

### Step 3 — Thread the two missing fields through the thesis payload

The stock page gets its metrics from `/api/thesis/[symbol]`'s `context.keyMetrics`
([route.ts:53](app/api/thesis/[symbol]/route.ts)), which currently forwards only
`peRatio/roe/debtToEquity` from `context.fundamentals`. Read `lib/ai/context.ts` first to
confirm `buildContext` already carries full `fundamentals` (it does — the route accesses
`context.fundamentals.peRatio`). Then:

- In the route's `keyMetrics` object add:
  `pbRatio: context.fundamentals.pbRatio, dividendYield: context.fundamentals.dividendYield,`
  and `fundamentals: context.fundamentals` is NOT needed — keep the flat shape.
- **Cache-key bump required**: the thesis response is cached under `thesis:${symbol}:v3`
  (1h TTL, and `postbuild` pre-warms 6 symbols). Cached entries lack the new fields, so the
  page would render `undefined` for up to an hour. Bump the key to `thesis:${symbol}:v4`
  in BOTH places it appears: `app/api/thesis/[symbol]/route.ts` AND
  `app/api/v2/thesis/[symbol]/route.ts` (they share the key), plus the `readCache` reference
  in `app/api/stocks/[symbol]/route.ts` (`thesis:${symbol}:v3` at line ~60 — it only reads
  `priceDropEvent`, but keep it pointing at the live key or it will read nothing forever).
  Search the whole repo for `:v3` to be sure (`scripts/warm-cache.ts` may reference it too).

### Step 4 — `app/stock/[symbol]/page.tsx`

- Extend the local `KeyMetrics` interface: `pbRatio: number | null; dividendYield: number | null;`
- In the FUNDAMENTALS section add after the ROE row:
  ```tsx
  <DataRow label="P/B Ratio" value={keyMetrics.pbRatio !== null ? keyMetrics.pbRatio.toFixed(1) : '—'} />
  <DataRow label="Dividend Yield" value={keyMetrics.dividendYield !== null ? (keyMetrics.dividendYield * 100).toFixed(2) + '%' : '—'} />
  ```
  (dividendYield is stored as a decimal fraction per the comment chain in
  `lib/data/normalize.ts` — multiply by 100 for display, mirroring the ROE row.)
- Completeness pill: next to the existing `{score}% VERIFIED` pill in the header, add:
  ```tsx
  <Pill variant={c.present === c.total ? 'up' : c.present >= 4 ? 'accent' : 'down'}>
    DATA {c.present}/{c.total}
  </Pill>
  ```
  where `c = fundamentalsCompleteness({...})` built from the keyMetrics fields. NOTE:
  `keyMetrics` doesn't include `marketCap` — either add `marketCap` to keyMetrics in Step 3
  (preferred, one more line) or compute completeness over the 5 available fields with
  `total: 5`. Prefer adding marketCap: the pill should mean the same thing everywhere.
- Guard: `keyMetrics.pbRatio` may be `undefined` (not just null) if an old deploy/cache shape
  sneaks through — the `!== null` checks above render `undefined.toFixed` crashes. Use
  `keyMetrics.pbRatio != null` (loose) in the JSX conditions to cover both.

### Step 5 — `lib/data/completeness.test.ts`

1. All six present → `{present: 6, missing: []}`.
2. `debtToEquity: 0` → counts as **present** (regression test for the Step 1 bug).
3. `pbRatio: null, dividendYield: null` → `present: 4`, missing lists exactly those two.
4. All null → `present: 0`.

### Step 6 — Verify

`npm test`, `npx tsc --noEmit`, `npm run build`. Then dev server:
- `/stock/RELIANCE` shows P/B and Dividend Yield rows and a `DATA n/6` pill.
- `/api/stocks/RELIANCE` still returns valid JSON (StockDataSchema unchanged — Step 1 changed
  values, not shape).
- Pick a ticker known to miss fields (e.g. some insurers return null P/B): pill drops below 6/6
  and the missing rows show `—`, no crash.

## Edge cases a weaker model would miss

- **The cache-key bump is not optional.** Three files reference `thesis:${symbol}:v3`; missing
  one either serves stale shapes for an hour or silently breaks `priceDropEvent` attachment
  forever. Grep, don't trust memory.
- **`0` vs `null` is the entire point**: debt-free companies (D/E = 0) are exactly the ones
  where the current code lies. The completeness function must treat 0 as data.
- **dividendYield units**: Yahoo's `summaryDetail.dividendYield` is a decimal fraction
  (0.0123 = 1.23%). yahoo-finance2 has historically flip-flopped on this; the repo's comments
  pin "decimal from Yahoo". Display with ×100 like ROE. If a sanity check shows values > 1
  (i.e. 1.23 meaning 1.23%), stop and re-check against the live site's compare table
  (`components/comparison-table.tsx` `fmtPct` handles the same field — mirror whatever it does).
- **Index symbols** (`^NSEI`): fundamentals are all-null by construction — the thesis route
  gates them out (Nifty-50 only) so the stock page never sees them, but `fundamentalsCompleteness`
  returning 0/6 must not crash anything if reused later on `/api/stocks`.
- **ISR + `generateStaticParams`**: the 6 featured stock pages are prerendered at build time
  with `revalidate = 3600`. After deploying, those pages serve the old shape until
  revalidation — the `!= null` guards in Step 4 are what prevent a crash during that window.
- **Server component**: `app/stock/[symbol]/page.tsx` is a Server Component — the completeness
  helper must stay a pure function with no hooks/state (it is; just don't put it in a
  `'use client'` file).

## Acceptance criteria

1. `npm test` green including 4 new completeness tests; `npx tsc --noEmit` clean; build passes.
2. Repo-wide grep for `thesis:` cache keys shows a single consistent version suffix (`:v4`)
   across `app/api/thesis/[symbol]/route.ts`, `app/api/v2/thesis/[symbol]/route.ts`,
   `app/api/stocks/[symbol]/route.ts`, and any script that references it.
3. `/stock/RELIANCE` renders P/B, Dividend Yield (as a percentage), and the `DATA n/6` pill.
4. A mocked/unit-level check proves `debtToEquity: 0` from Yahoo surfaces as `0.00` in the UI
   path (unit test at the `fetchFundamentals` extraction level is acceptable: feed
   `financialData: { debtToEquity: 0 }` through the extraction expression and assert `0`).
5. No visual regression on the rest of the fundamentals panel (same `DataRow` component,
   `divider={false}` stays only on the last row — move it if you appended rows after "1Y High").
