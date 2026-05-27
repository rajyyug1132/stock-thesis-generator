# v2 API Plan — Rate Limiting + Auth

## Overview

The v2 API adds per-user authentication, API key management, and tiered rate limiting.
The goal is to expose the thesis engine as a programmable API for developers while protecting AI quota and database capacity.

---

## Architecture

### Auth Model

Two access modes:

| Mode | Who | How | Rate limit |
|------|-----|-----|------------|
| **Anonymous** | Any unauthenticated request | No key | 5 req/min IP-based (already in middleware) |
| **User session** | Logged-in web users | Supabase JWT (already works) | 60 req/min per user |
| **API key** | Developer integrations | `X-API-Key: qe_live_...` header | Per-tier (see below) |

### API Key Tiers

| Tier | Req/min | Req/day | AI calls/day | Price |
|------|---------|---------|--------------|-------|
| Free | 10 | 100 | 20 | Free |
| Pro | 60 | 5,000 | 500 | Future |

---

## Database Changes

```sql
-- api_keys table
CREATE TABLE api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,            -- Supabase auth UID
  key_hash    TEXT NOT NULL UNIQUE,     -- SHA-256 of the raw key, never stored plain
  key_prefix  TEXT NOT NULL,            -- first 8 chars for display e.g. "qe_live_"
  name        TEXT NOT NULL,            -- user-given label e.g. "My trading bot"
  tier        TEXT NOT NULL DEFAULT 'free',
  revoked     BOOLEAN NOT NULL DEFAULT false,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

Key format: `qe_live_<32 random chars>` (similar to Stripe/OpenAI key format)
- `qe_` = product prefix
- `live_` = env (vs `test_` for development)
- Stored as SHA-256 hash only — the raw key is shown once at creation

---

## New Endpoints

### Key Management

```
POST   /api/v2/keys           — Create a new API key (requires JWT auth)
GET    /api/v2/keys           — List user's keys (shows prefix + metadata, never raw key)
DELETE /api/v2/keys/:id       — Revoke a key
```

### Public API (works with API key OR JWT)

```
GET /api/v2/thesis/:symbol    — Same as v1 but v2 response envelope + usage headers
GET /api/v2/stocks/:symbol    — Price + fundamentals
GET /api/v2/news/:symbol      — Recent news (5 items)
GET /api/v2/compare           — ?symbols=RELIANCE,TCS (up to 5 symbols)
```

### Response envelope change (v2)

v1 routes return data directly. v2 wraps in a consistent envelope:

```json
{
  "ok": true,
  "data": { ... },
  "meta": {
    "fetchedAt": "2026-05-27T10:00:00Z",
    "cached": true,
    "requestId": "req_abc123"
  }
}
```

Error responses:
```json
{
  "ok": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded. Resets in 47 seconds.",
    "retryAfter": 47
  }
}
```

### Rate limit headers (on all v2 responses)

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 8
X-RateLimit-Reset: 1748340060
X-RateLimit-Tier: free
```

---

## Middleware Changes

The current `middleware.ts` does IP-based rate limiting only. v2 extends it:

```typescript
// middleware.ts resolution order:
// 1. Check X-API-Key header → hash it → look up in Redis cache (5min TTL)
//    → if found: use per-key limits (by key id, not IP)
//    → if not found: fall back to IP limits
// 2. Check Authorization: Bearer <JWT> → Supabase verify
//    → if valid: use per-user limits (by user_id)
// 3. No auth → apply anonymous IP limits

// Redis key patterns:
// rl:key:{keyId}:min    → sliding window, 1 min
// rl:key:{keyId}:day    → sliding window, 24 hr
// rl:user:{userId}:min  → sliding window, 1 min
// rl:ip:{ip}:min        → sliding window, 1 min (current)
```

Key lookup must be fast. Strategy:
- Cache key_hash → {id, tier, revoked} in Redis with 5-min TTL
- On cache miss: DB lookup + populate cache
- Cache invalidation on revoke: delete Redis key immediately

---

## Key Creation Flow

```
POST /api/v2/keys
Authorization: Bearer <supabase_jwt>
Body: { "name": "My bot" }

Response 201:
{
  "ok": true,
  "data": {
    "id": "uuid",
    "name": "My bot",
    "key": "qe_live_abc123...xyz",  ← shown ONCE, never again
    "keyPrefix": "qe_live_ab",
    "tier": "free",
    "createdAt": "..."
  }
}
```

Raw key: `qe_live_` + `crypto.randomBytes(24).toString('hex')` (48 hex chars = 192 bits)
Stored: `SHA-256(rawKey)` in `key_hash` column

---

## UI — API Keys Page

New page: `/portfolio/api-keys`

Shows:
- List of active keys (prefix + name + last_used_at + tier badge)
- "Create new key" button → modal shows key once with copy button
- Revoke button per key

---

## Migration Path from v1

v1 routes (`/api/thesis/[symbol]` etc.) remain unchanged — no breaking change.
v2 routes live under `/api/v2/` prefix.

Deprecation plan (future):
- v1 routes log a `Deprecation: Upgrade to /api/v2/` header after v2 ships
- v1 sunset in 6 months

---

## Implementation Order

1. **DB + migration** — `api_keys` table (`drizzle-kit generate`)
2. **Key creation/listing/revocation** — `app/api/v2/keys/route.ts`
3. **Middleware auth resolver** — extend `middleware.ts` to check `X-API-Key`
4. **Rate limiter update** — per-key sliding window in Upstash
5. **v2 routes** — thin wrappers around existing logic with v2 envelope
6. **UI** — `/portfolio/api-keys` page
7. **Docs** — update README with API reference

---

## Security Considerations

- **Never store raw keys** — only SHA-256 hash. If DB is leaked, keys cannot be reversed.
- **No key in URL params** — always header `X-API-Key`. URL params appear in logs.
- **Key rotation UX** — "Rotate" creates a new key and gives a 24hr grace period where old key still works (with a warning header).
- **Scope limiting** — keys are read-only by default (GET endpoints only). Write operations (snapshots, alerts) require JWT auth.
- **Audit log** — `last_used_at` updated on every request (debounced, max 1 write/5min per key).
