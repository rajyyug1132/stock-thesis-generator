import { describe, it, expect } from 'vitest';
import { normalizeTicker, InvalidTickerError } from './tickers';

describe('normalizeTicker', () => {
  it('uppercases and appends .NS to bare NSE symbols', () => {
    expect(normalizeTicker('reliance')).toBe('RELIANCE.NS');
    expect(normalizeTicker('TCS')).toBe('TCS.NS');
  });

  it('keeps an existing .NS suffix and converts .BO/.BOM to .NS', () => {
    expect(normalizeTicker('INFY.NS')).toBe('INFY.NS');
    expect(normalizeTicker('TATAMOTORS.BO')).toBe('TATAMOTORS.NS');
  });

  it('maps index aliases to Yahoo index symbols', () => {
    expect(normalizeTicker('nifty')).toBe('^NSEI');
    expect(normalizeTicker('NSEI')).toBe('^NSEI');
    expect(normalizeTicker('sensex')).toBe('^BSESN');
  });

  it('passes through Yahoo index symbols unchanged', () => {
    expect(normalizeTicker('^NSEI')).toBe('^NSEI');
  });

  it('handles symbols with & and - (M&M, BAJAJ-AUTO)', () => {
    expect(normalizeTicker('m&m')).toBe('M&M.NS');
    expect(normalizeTicker('BAJAJ-AUTO')).toBe('BAJAJ-AUTO.NS');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeTicker('  hdfcbank  ')).toBe('HDFCBANK.NS');
  });

  it('rejects empty, embedded-space, and injection-style input', () => {
    expect(() => normalizeTicker('')).toThrow(InvalidTickerError);
    expect(() => normalizeTicker('REL IANCE')).toThrow(InvalidTickerError);
    expect(() => normalizeTicker('TCS;DROP TABLE')).toThrow(InvalidTickerError);
    expect(() => normalizeTicker('../etc/passwd')).toThrow(InvalidTickerError);
  });
});
