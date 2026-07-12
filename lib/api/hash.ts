/**
 * API-key hashing, isolated from auth.ts's DB imports so it can be unit-tested
 * and reused without pulling in postgres/drizzle. Must stay byte-identical to
 * the middleware's Edge-runtime crypto.subtle SHA-256 (see middleware.ts).
 */
import { createHash } from 'crypto';

export function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}
