import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { keyCacheKey } from './key-cache';
import { hashKey } from './hash';

describe('hashKey / middleware sha256Hex parity', () => {
  it('matches a plain sha256 hex digest (must match crypto.subtle in middleware.ts)', () => {
    const raw = 'qe_live_abc';
    const expected = createHash('sha256').update(raw).digest('hex');
    expect(hashKey(raw)).toBe(expected);
  });
});

describe('keyCacheKey', () => {
  it('is stable — a rename here would strand cached entries', () => {
    expect(keyCacheKey('deadbeef')).toBe('apikey:v1:deadbeef');
  });
});
