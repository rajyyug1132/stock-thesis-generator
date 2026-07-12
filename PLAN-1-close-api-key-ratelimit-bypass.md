# PLAN-1 — Close the API-key rate-limit bypass and enforce real per-key limits

## Goal

`middleware.ts` currently grants the higher "API key" rate-limit tier to **any request whose
`X-API-Key` header starts with `qe_`** — the key is never validated. An attacker can send
`X-API-Key: qe_aaaa1`, `qe_aaaa2`, `qe_aaaa3`, … and every made-up value gets its own fresh
sliding window, completely bypassing IP-based rate limits on the expensive AI routes
(`/api/thesis/*`, `/api/stress`, `/api/v2/thesis/*`). Fix this so that:

1. Unvalidated/unknown keys fall back to **IP-based** limits (bypass closed).
2. Validated keys get per-key limits keyed by their **database UUID** (not raw key material).
3. Per-tier **daily** limits (advertised in `X-RateLimit-Limit-Day` headers but never enforced)
   are actually enforced: free = 100/day, pro = 5000/day.
4. Key revocation takes effect within one request (cache invalidated on revoke).

Design (matches the original intent in `docs/v2-api-plan.md`, "Middleware Changes" section):
the middleware **only reads a Redis cache** of validated keys; it never touches Postgres.
The Node-runtime route handlers (via `resolveAuth` in `lib/api/auth.ts`) populate that cache
after a successful DB lookup. So the first request with a valid key gets IP limits (fine),
and subsequent requests within the 5-minute cache TTL get per-key limits.

## Files to touch

| File | Change |
|---|---|
| `middleware.ts` | Validate key via Redis cache before granting key-tier limits; add daily limiters; key limiters by DB UUID |
| `lib/api/auth.ts` | After successful DB key lookup, write the validated-key entry to Redis (5 min TTL); add 60s negative cache for unknown keys |
| `app/api/v2/keys/route.ts` | On DELETE (revoke), delete the key's Redis cache entry |
| `lib/api/key-cache.ts` | **New file** — shared helpers: cache key naming, read/write/delete of validated-key entries |
| `lib/api/key-cache.test.ts` | **New file** — unit tests for hash parity and cache entry shape |

## Critical constraints (read before writing any code)

1. **Next.js middleware runs on the Edge runtime.** `import { createHash } from 'crypto'`
   (used in `lib/api/auth.ts`) is **not available** in `middleware.ts`. In the middleware you
   MUST hash the header with the Web Crypto API:
   ```ts
   async function sha256Hex(input: string): Promise<string> {
     const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
     return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
   }
   ```
   This must produce byte-identical output to `hashKey()` in `lib/api/auth.ts`
   (`createHash('sha256').update(raw).digest('hex')`). Do NOT import anything from
   `lib/api/auth.ts` into `middleware.ts` — that file imports `postgres` and `drizzle`,
   which will break the Edge bundle.
2. **`@upstash/redis` works on Edge** (it is REST-based) and is already used in the middleware.
   Keep using it.
3. **Upstash `redis.get()` auto-deserializes JSON.** If you `setex(key, ttl, JSON.stringify(obj))`,
   `get(key)` returns the parsed object, not a string. Do not `JSON.parse` the result of `get`.
4. **When Redis env vars are absent, the middleware is a no-op** (returns `NextResponse.next()`
   at line 65). Preserve that behavior — local dev without Upstash must keep working.
5. `lib/api/auth.ts` currently rate-limit-identifies keys by `apiKeyHeader.slice(0, 32)` in the
   middleware — that embeds raw key material in Redis key names. After this change, the limiter
   identity must be the key's DB UUID (`keyId`) from the cache entry.

## Implementation order

### Step 1 — `lib/api/key-cache.ts` (new)

```ts
// Node-runtime helpers for the validated-API-key Redis cache.
// The Edge middleware reads these entries; only Node routes write them.
import { Redis } from '@upstash/redis';

export interface CachedKeyEntry {
  keyId: string;               // api_keys.id (UUID)
  userId: string;
  tier: 'free' | 'pro';
}

export const KEY_CACHE_TTL_SEC = 300;      // 5 min, per docs/v2-api-plan.md
export const KEY_NEGATIVE_TTL_SEC = 60;    // unknown-key negative cache

export function keyCacheKey(keyHash: string): string {
  return `apikey:v1:${keyHash}`;
}
```
Add `getRedis(): Redis | null` (same env-var guard pattern as `lib/cache/redis.ts`), plus
`readKeyCache(hash)`, `writeKeyCache(hash, entry)`, `writeNegativeKeyCache(hash)` (stores the
string literal `"invalid"`), and `deleteKeyCache(hash)`. Keep it ~60 lines.

### Step 2 — `lib/api/auth.ts`

In `resolveApiKey()`:
- Before the DB lookup: `const cached = await readKeyCache(hash)`. If it is `"invalid"`,
  return `{ error: 'API key not found or revoked', status: 401 }` without touching the DB.
  If it is an object, return `{ mode: 'apikey', ...cached }` without touching the DB.
- After a **successful** DB lookup: `await writeKeyCache(hash, { keyId: key.id, userId: key.userId, tier: key.tier })`.
- After a **failed** DB lookup (key not found or revoked): `await writeNegativeKeyCache(hash)`.
  This stops attackers from hammering Postgres with random keys through the v2 routes.
- All cache calls best-effort: wrap in try/catch and proceed to/with the DB result on cache errors.

### Step 3 — `middleware.ts`

Replace the `if (apiKeyHeader && apiKeyHeader.startsWith('qe_'))` block (lines 70–82) with:

```ts
if (apiKeyHeader && apiKeyHeader.startsWith('qe_')) {
  const hash = await sha256Hex(apiKeyHeader);
  const entry = await redis.get(`apikey:v1:${hash}`).catch(() => null);
  if (entry && entry !== 'invalid' && typeof entry === 'object') {
    const { keyId, tier } = entry as { keyId: string; tier: 'free' | 'pro' };
    // minute limiter
    const minuteLimiter = pickMinuteLimiter(tier, isAiRoute);
    const m = await minuteLimiter.limit(keyId);
    if (!m.success) return rl429(m.limit, m.remaining, m.reset, 'API key rate limit exceeded');
    // day limiter
    const dayLimiter = pickDayLimiter(tier);
    const d = await dayLimiter.limit(keyId);
    if (!d.success) return rl429(d.limit, d.remaining, d.reset, 'API key daily limit exceeded');
    return NextResponse.next();
  }
  // Unknown / not-yet-validated / revoked key → fall through to IP limits below.
}
```
Limiter instances (module-level, same lazy `redisAvailable` guard as the existing ones):
- minute, free: `slidingWindow(10, '60 s')`, prefix `rl:key:free:min`
- minute, pro: `slidingWindow(60, '60 s')`, prefix `rl:key:pro:min`
- day, free: `slidingWindow(100, '86400 s')`, prefix `rl:key:free:day`
- day, pro: `slidingWindow(5000, '86400 s')`, prefix `rl:key:pro:day`

Keep the existing `keyAiLimiter`/`keyApiLimiter` names or replace them — but make sure the
AI-route minute limit for keys stays at 10/min (free) and 60/min (pro is fine at 60).
Duplicate the `sha256Hex` helper inside `middleware.ts` (do not import from Node-only files).
Note the raw string `'invalid'` check: Upstash returns the stored string as-is for the negative
entry, but a JSON object for real entries.

### Step 4 — `app/api/v2/keys/route.ts` (DELETE handler)

The revoke update must also purge the cache. The handler only has the key `id`, not the hash,
so fetch the hash from the row you update:

```ts
const [row] = await withDb((db) =>
  db.update(apiKeys)
    .set({ revoked: true })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, auth.userId)))
    .returning({ keyHash: apiKeys.keyHash })
);
if (row) await deleteKeyCache(row.keyHash).catch(() => {});
```
Note: if the `where` matched nothing (wrong id or another user's key), `row` is `undefined` —
guard for that (the current code silently "succeeds"; keep that behavior but skip the cache call).

### Step 5 — tests (`lib/api/key-cache.test.ts`)

- Hash parity: assert `hashKey('qe_live_abc')` from `lib/api/auth.ts` equals a locally computed
  `crypto.createHash('sha256')...` hex — and document in a comment that the middleware's
  `crypto.subtle` implementation must match (you can't run Edge code in vitest; the parity test
  pins the expected hex so the middleware constant can be checked against it manually).
- `keyCacheKey()` naming stability (a rename would strand cached entries).
- Run: `npm test` — the 26 existing tests plus new ones must pass.

### Step 6 — typecheck + build

`npx tsc --noEmit` then `npm run build`. The build step is the real Edge-bundle check: if you
accidentally imported a Node-only module into `middleware.ts`, the build fails here.

## Edge cases a weaker model would miss

- **Edge runtime**: `node:crypto`, `postgres`, `drizzle` cannot be imported (even transitively)
  into `middleware.ts`. This is the #1 way this change breaks.
- **Upstash auto-JSON**: `get()` returns a parsed object; `JSON.parse`-ing it throws.
- **Negative cache is a string**, real entries are objects — the type check `entry !== 'invalid' && typeof entry === 'object'` covers both.
- **First-request window**: a brand-new valid key gets IP limits until a v2 route call populates
  the cache. That's by design — do not add DB access to the middleware to "fix" it.
- **Revoked key within cache TTL**: without Step 4 a revoked key keeps elevated limits for up to
  5 minutes. Step 4 closes this; `resolveAuth` also negative-caches it after the next DB check.
- **Redis-less mode**: everything must degrade to the current no-op behavior (dev without Upstash).
- **`.catch(() => null)` on the middleware Redis get**: an Upstash outage must not 500 every API request.

## Acceptance criteria

1. `npm test` passes; `npx tsc --noEmit` clean; `npm run build` succeeds (Edge bundle compiles).
2. With Redis configured locally, `for i in $(seq 1 12); do curl -s -o /dev/null -w "%{http_code}\n" -H "X-API-Key: qe_fake$i" http://localhost:3000/api/thesis/RELIANCE; done` —
   the fake keys do NOT each get a fresh window; requests are limited by IP (429s appear after
   the 10th AI-route request regardless of the rotating header).
3. Create a real key (POST `/api/v2/keys` with a Supabase JWT), call `/api/v2/thesis/RELIANCE`
   with it twice; on the second call within 5 minutes, Redis contains `apikey:v1:<sha256>` and
   `rl:key:free:min:*` counters keyed by the key's UUID (inspect with Upstash console or `redis.keys`).
4. The 11th same-key AI request within a minute returns 429 with `API key rate limit exceeded`;
   the 101st request in a day returns 429 with `API key daily limit exceeded`.
5. DELETE the key, then call again with it: 401 from the route, and the middleware applies IP
   limits (no `rl:key:` counter increments for it).
