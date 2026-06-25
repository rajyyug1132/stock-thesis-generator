// Nifty Bank index constituents (12 stocks, subset already in Nifty 50)
// Useful as a standalone universe for sector-focused analysis.

import type { UniverseStock } from './niftyNext50';

export const NIFTY_BANK: UniverseStock[] = [
  { symbol: 'HDFCBANK.NS',   name: 'HDFC Bank',                  sector: 'BFSI', universe: 'niftybank' },
  { symbol: 'ICICIBANK.NS',  name: 'ICICI Bank',                  sector: 'BFSI', universe: 'niftybank' },
  { symbol: 'KOTAKBANK.NS',  name: 'Kotak Mahindra Bank',         sector: 'BFSI', universe: 'niftybank' },
  { symbol: 'SBIN.NS',       name: 'State Bank of India',         sector: 'BFSI', universe: 'niftybank' },
  { symbol: 'AXISBANK.NS',   name: 'Axis Bank',                   sector: 'BFSI', universe: 'niftybank' },
  { symbol: 'INDUSINDBK.NS', name: 'IndusInd Bank',               sector: 'BFSI', universe: 'niftybank' },
  { symbol: 'AUBANK.NS',     name: 'AU Small Finance Bank',       sector: 'BFSI', universe: 'niftybank' },
  { symbol: 'BANDHANBNK.NS', name: 'Bandhan Bank',                sector: 'BFSI', universe: 'niftybank' },
  { symbol: 'FEDERALBNK.NS', name: 'Federal Bank',                sector: 'BFSI', universe: 'niftybank' },
  { symbol: 'IDFCFIRSTB.NS', name: 'IDFC First Bank',             sector: 'BFSI', universe: 'niftybank' },
  { symbol: 'PNB.NS',        name: 'Punjab National Bank',        sector: 'BFSI', universe: 'niftybank' },
  { symbol: 'BANKBARODA.NS', name: 'Bank of Baroda',              sector: 'BFSI', universe: 'niftybank' },
];
