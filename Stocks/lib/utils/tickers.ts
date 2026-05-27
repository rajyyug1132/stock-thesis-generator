export class InvalidTickerError extends Error {
  constructor(input: string) {
    super(`Invalid ticker: "${input}". Must be alphanumeric, optionally with .NS or .BO suffix.`);
    this.name = 'InvalidTickerError';
  }
}

/** Yahoo Finance symbols for Indian market indices (no .NS suffix) */
const INDEX_MAP: Record<string, string> = {
  NSEI: '^NSEI',
  NIFTY: '^NSEI',
  SENSEX: '^BSESN',
  BSESN: '^BSESN',
};

export function normalizeTicker(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new InvalidTickerError(input);
  }

  const trimmed = input.trim().toUpperCase();

  // Check for spaces or invalid chars
  if (/\s/.test(trimmed) || /[^A-Z0-9.\-&^]/.test(trimmed)) {
    throw new InvalidTickerError(input);
  }

  // Index symbols — return as-is with Yahoo's ^ prefix
  const base = trimmed.replace(/\.(NS|BO|BOM)$/i, '');
  if (INDEX_MAP[base]) return INDEX_MAP[base];
  // Already a Yahoo index symbol (e.g. ^NSEI passed directly)
  if (trimmed.startsWith('^')) return trimmed;

  if (!base) {
    throw new InvalidTickerError(input);
  }

  // Always return .NS for NSE equities
  return `${base}.NS`;
}
