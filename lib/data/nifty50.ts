// Nifty 50 constituents (as of approx 2025 — VERIFY any borderline names)
// Sector taxonomy custom to this app.

import { NIFTY_NEXT_50 } from './niftyNext50';
export type { UniverseStock } from './niftyNext50';

export type Sector =
  | 'IT'
  | 'BFSI'
  | 'OIL_GAS'
  | 'AUTO'
  | 'FMCG'
  | 'PHARMA'
  | 'METALS'
  | 'CEMENT'
  | 'TELECOM'
  | 'POWER'
  | 'CONSUMER'
  | 'INFRA'
  | 'OTHER';

export interface Nifty50Stock {
  symbol: string;
  name: string;
  sector: Sector;
}

export const NIFTY_50: Nifty50Stock[] = [
  // BFSI
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', sector: 'BFSI' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', sector: 'BFSI' },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank', sector: 'BFSI' },
  { symbol: 'SBIN.NS', name: 'State Bank of India', sector: 'BFSI' },
  { symbol: 'AXISBANK.NS', name: 'Axis Bank', sector: 'BFSI' },
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance', sector: 'BFSI' },
  { symbol: 'BAJAJFINSV.NS', name: 'Bajaj Finserv', sector: 'BFSI' },
  { symbol: 'HDFCLIFE.NS', name: 'HDFC Life Insurance', sector: 'BFSI' },
  { symbol: 'SBILIFE.NS', name: 'SBI Life Insurance', sector: 'BFSI' },
  { symbol: 'INDUSINDBK.NS', name: 'IndusInd Bank', sector: 'BFSI' }, // VERIFY — may have been removed
  { symbol: 'SHRIRAMFIN.NS', name: 'Shriram Finance', sector: 'BFSI' },

  // IT
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services', sector: 'IT' },
  { symbol: 'INFY.NS', name: 'Infosys', sector: 'IT' },
  { symbol: 'WIPRO.NS', name: 'Wipro', sector: 'IT' },
  { symbol: 'HCLTECH.NS', name: 'HCL Technologies', sector: 'IT' },
  { symbol: 'TECHM.NS', name: 'Tech Mahindra', sector: 'IT' },
  { symbol: 'LTIM.NS', name: 'LTIMindtree', sector: 'IT' },

  // Oil & Gas
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', sector: 'OIL_GAS' },
  { symbol: 'ONGC.NS', name: 'Oil and Natural Gas Corporation', sector: 'OIL_GAS' },
  { symbol: 'BPCL.NS', name: 'Bharat Petroleum', sector: 'OIL_GAS' },
  { symbol: 'COALINDIA.NS', name: 'Coal India', sector: 'OIL_GAS' },

  // Auto
  { symbol: 'MARUTI.NS', name: 'Maruti Suzuki India', sector: 'AUTO' },
  { symbol: 'TATAMOTORS.NS', name: 'Tata Motors', sector: 'AUTO' },
  { symbol: 'M&M.NS', name: 'Mahindra & Mahindra', sector: 'AUTO' },
  { symbol: 'BAJAJ-AUTO.NS', name: 'Bajaj Auto', sector: 'AUTO' },
  { symbol: 'HEROMOTOCO.NS', name: 'Hero MotoCorp', sector: 'AUTO' },
  { symbol: 'EICHERMOT.NS', name: 'Eicher Motors', sector: 'AUTO' },

  // FMCG
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever', sector: 'FMCG' },
  { symbol: 'ITC.NS', name: 'ITC', sector: 'FMCG' },
  { symbol: 'NESTLEIND.NS', name: 'Nestle India', sector: 'FMCG' },
  { symbol: 'BRITANNIA.NS', name: 'Britannia Industries', sector: 'FMCG' },
  { symbol: 'TATACONSUM.NS', name: 'Tata Consumer Products', sector: 'FMCG' },

  // Pharma
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical', sector: 'PHARMA' },
  { symbol: 'DRREDDY.NS', name: "Dr Reddy's Laboratories", sector: 'PHARMA' },
  { symbol: 'CIPLA.NS', name: 'Cipla', sector: 'PHARMA' },
  { symbol: 'APOLLOHOSP.NS', name: 'Apollo Hospitals', sector: 'PHARMA' },

  // Metals
  { symbol: 'TATASTEEL.NS', name: 'Tata Steel', sector: 'METALS' },
  { symbol: 'JSWSTEEL.NS', name: 'JSW Steel', sector: 'METALS' },
  { symbol: 'HINDALCO.NS', name: 'Hindalco Industries', sector: 'METALS' },

  // Cement
  { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement', sector: 'CEMENT' },
  { symbol: 'GRASIM.NS', name: 'Grasim Industries', sector: 'CEMENT' },

  // Telecom
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel', sector: 'TELECOM' },

  // Power
  { symbol: 'NTPC.NS', name: 'NTPC', sector: 'POWER' },
  { symbol: 'POWERGRID.NS', name: 'Power Grid Corporation', sector: 'POWER' },
  { symbol: 'ADANIPORTS.NS', name: 'Adani Ports', sector: 'INFRA' },
  { symbol: 'ADANIENT.NS', name: 'Adani Enterprises', sector: 'INFRA' },

  // Consumer / Other
  { symbol: 'ASIANPAINT.NS', name: 'Asian Paints', sector: 'CONSUMER' },
  { symbol: 'TITAN.NS', name: 'Titan Company', sector: 'CONSUMER' },
  { symbol: 'TRENT.NS', name: 'Trent', sector: 'CONSUMER' },

  // Infra
  { symbol: 'LT.NS', name: 'Larsen & Toubro', sector: 'INFRA' },

  // Misc / VERIFY
  { symbol: 'BEL.NS', name: 'Bharat Electronics', sector: 'OTHER' }, // VERIFY — recently added
  { symbol: 'JIOFIN.NS', name: 'Jio Financial Services', sector: 'BFSI' }, // VERIFY
];

const SYMBOL_INDEX = new Map(NIFTY_50.map((s) => [s.symbol, s]));

export function getSector(symbol: string): Sector | null {
  return SYMBOL_INDEX.get(symbol)?.sector ?? null;
}

export function isNifty50(symbol: string): boolean {
  return SYMBOL_INDEX.has(symbol);
}

export function getName(symbol: string): string | null {
  return SYMBOL_INDEX.get(symbol)?.name ?? null;
}

// Combined universe: Nifty 50 + Nifty Next 50 (no duplicates).
// NiftyBank stocks are a subset of Nifty 50, so they're not added again.
export const ALL_STOCKS = [
  ...NIFTY_50.map((s) => ({ ...s, universe: 'nifty50' as const })),
  ...NIFTY_NEXT_50,
];
