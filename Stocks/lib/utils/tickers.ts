export class InvalidTickerError extends Error {
  constructor(input: string) {
    super(`Invalid ticker: "${input}". Must be alphanumeric, optionally with .NS or .BO suffix.`);
    this.name = 'InvalidTickerError';
  }
}

export function normalizeTicker(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new InvalidTickerError(input);
  }

  const trimmed = input.trim().toUpperCase();

  // Check for spaces or invalid chars
  if (/\s/.test(trimmed) || /[^A-Z0-9.\-&]/.test(trimmed)) {
    throw new InvalidTickerError(input);
  }

  // Remove exchange suffix if present
  let symbol = trimmed.replace(/\.(NS|BO|BOM)$/i, '');

  if (!symbol) {
    throw new InvalidTickerError(input);
  }

  // Always return .NS for NSE
  return `${symbol}.NS`;
}
