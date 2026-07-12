# PLAN-3 — Test the grounding pipeline and fix the in-memory cache defects

## Goal

The two-pass grounding (generate thesis → verify every claim) is the product's core claim —
the README leads with it — yet `lib/ai/validate.ts` has **zero tests**, and `lib/cache/redis.ts`
(which decides whether a thesis is served fresh or stale) has zero tests plus two real defects:

1. **The in-memory fallback cache never expires and never evicts** ([redis.ts:23](lib/cache/redis.ts),
   `const memoryCache = new Map<string, any>()`). When Upstash env vars are missing (local dev,
   or a misconfigured deploy), `cached()` ignores `ttlSec` entirely: a thesis generated once is
   served forever, and the map grows unboundedly.
2. **`readCache()` returns `memoryCache.get(key) || null`** — a cached falsy value (0, '', false)
   is reported as a miss. Harmless today (only objects are cached) but a trap; fix with `?? null`.

Deliverables: fix both defects, then add unit tests for (a) the memory-cache TTL behavior,
(b) the stale-fallback path of `cached()`, and (c) the pure parts of the validation pipeline
(`buildPrompt`, the soft-fail path). No network calls in any test.

## Files to touch

| File | Change |
|---|---|
| `lib/cache/redis.ts` | Memory cache entries get `expiresAt`; respect `ttlSec`; cap size; `?? null` fix |
| `lib/cache/redis.test.ts` | **New** — TTL, miss/hit, stale-fallback tests |
| `lib/ai/validate.ts` | `export` the currently-private `buildPrompt` (test seam; no behavior change) |
| `lib/ai/validate.test.ts` | **New** — prompt construction + soft-fail tests |

## Implementation order

### Step 1 — Fix `lib/cache/redis.ts` memory fallback

Replace the raw `Map<string, any>` with entries shaped `{ data: any; expiresAt: number }`:

- In `cached()` no-redis branch: a hit requires `entry.expiresAt > Date.now()`; expired entries
  are deleted and treated as a miss. On store: `memoryCache.set(key, { data, expiresAt: Date.now() + ttlSec * 1000 })`.
- In `readCache()` no-redis branch: same expiry check; return `entry?.data ?? null` (the `??`
  also fixes the falsy-value bug).
- Add a simple size cap: after each set, `if (memoryCache.size > 500) { delete oldest }` —
  `Map` iterates in insertion order, so the oldest key is `memoryCache.keys().next().value`.
  Do not build an LRU; insertion-order eviction is enough for a dev fallback.
- Do NOT touch the Redis code paths — they already delegate TTL to `setex`.

### Step 2 — `lib/cache/redis.test.ts`

The module captures `process.env` **at import time** (module-level `REDIS_AVAILABLE` const).
Tests must control env *before* importing, so use `vi.resetModules()` + dynamic import:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

async function loadNoRedis() {
  vi.resetModules();
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
  return await import('./redis');
}
```
(`vi.stubEnv` with `''` works because the module checks truthiness. Call `vi.unstubAllEnvs()`
and `vi.useRealTimers()` in `afterEach`.)

Tests (all in no-redis mode, with `vi.useFakeTimers()`):
1. **miss → fetch → hit**: first `cached('k', 60, fetcher)` calls fetcher and returns
   `{cached: false}`; second call returns `{cached: true}` and fetcher ran once.
2. **TTL expiry**: after `vi.advanceTimersByTime(61_000)`, the same call re-invokes the fetcher.
3. **fetcher failure with no cache**: `cached()` rethrows the fetcher's error.
4. **`readCache` falsy value**: seed via `cached('k', 60, async () => 0)`, then
   `readCache('k')` returns `0`, not `null`.
5. **eviction cap**: insert 501 keys; the first-inserted key is gone, the 501st is present.

### Step 3 — Export `buildPrompt` from `lib/ai/validate.ts`

Change `function buildPrompt(...)` to `export function buildPrompt(...)`. Nothing else —
per the repo's CLAUDE.md surgical-changes rule, do not refactor the provider cascade.

### Step 4 — `lib/ai/validate.test.ts`

You need a minimal fixture `Thesis` and `Context`. Build them from the zod schemas in
`lib/ai/schemas.ts` and the `Context` type in `lib/ai/context.ts` — **read both files first**
and construct objects that satisfy the actual types (do not guess field names; e.g. bull/bear
points are `{ claim, evidence }`, risks are `{ risk, severity }`). Keep prices short (3 points).

Tests:
1. **Claim collection**: `buildPrompt(thesis, ctx)` returns one entry per bull point, bear
   point, and risk, with locations `bullCase.points[0]`, `bearCase.points[0]`, `risks[0]` etc.
2. **Percentage duality**: the prompt's SOURCE DATA contains `_statsPct.annualReturnPct` equal
   to `+(ctx.stats.annualReturn * 100).toFixed(1)` — this is the guard for the documented bug
   where fallback verifiers see "5.2%" in evidence but only `0.052` in source and mark
   everything UNVERIFIED (see comment at [validate.ts:59](lib/ai/validate.ts)).
3. **Compact mode**: `buildPrompt(thesis, ctx, true)` strips `prices` to `[]` and truncates
   news to ≤3 title-only items (this is what keeps Groq under its 12k TPM limit — if someone
   "simplifies" it away, Groq fallback breaks silently).
4. **Soft-fail**: with `vi.stubEnv` clearing `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`,
   `OPENROUTER_API_KEY`, `GROQ_API_KEY` (and `vi.resetModules()` + dynamic import, same
   pattern as Step 2 — the provider modules read env at call time via their `*Available()`
   helpers, but reset anyway to be safe), `validateThesis(thesis, ctx)` resolves to
   `{ claims: [], overallScore: 0.5, summary: 'Validation unavailable — no AI provider configured.' }`
   instead of throwing. This is the path that keeps thesis generation alive when all quota is gone.

### Step 5 — Run everything

`npm test` — expect the original 26 tests plus the new ones, all green. Then `npx tsc --noEmit`.

## Edge cases a weaker model would miss

- **Module-level env capture**: `REDIS_AVAILABLE` is computed once at import. Setting env vars
  inside a test *after* a static import does nothing. `vi.resetModules()` + dynamic `import()`
  per test group is mandatory, not optional.
- **Fake timers vs `Date.now()`**: `vi.useFakeTimers()` in Vitest mocks `Date.now()` by default —
  that's what the TTL check uses, so `advanceTimersByTime` works. Don't switch the implementation
  to `setTimeout`-based expiry; lazy expiry-on-read is simpler and testable.
- **The `_statsPct` duality is load-bearing** (percent-form and fraction-form both in the prompt).
  A test pinning it prevents a future "cleanup" from silently tanking grounding scores on the
  fallback providers.
- **The neutral soft-fail score is 0.5 by design** — it renders as amber "50% VERIFIED", not
  green or red. Do not "fix" it to 0 or 1 in the assertion.
- **Do not mock `@upstash/redis` for the Redis paths** — testing them adds a mock-heavy suite
  for code that just delegates to `setex`/`get`. The memory-fallback branch is where the logic
  (and the bugs) live. Scope discipline.
- **`type: "module"` in package.json** — test files use ESM imports; Vitest handles this
  zero-config here (the three existing `*.test.ts` files are the pattern to copy, including
  their import style).

## Acceptance criteria

1. `npm test` passes with ≥ 35 tests (26 existing + ~9 new), no network access needed
   (verify by running once with Wi-Fi off or `HTTPS_PROXY=http://127.0.0.1:1` set).
2. `npx tsc --noEmit` clean.
3. New behavior provable in isolation: in a Node REPL with no Upstash env,
   `cached('x', 1, f)` twice within 1s calls `f` once; after >1s, calls it again.
4. `readCache` of a cached `0` returns `0`.
5. `git diff` shows no changes to the Redis code paths in `redis.ts` and only the `export`
   keyword added in `validate.ts`.
