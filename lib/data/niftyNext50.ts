// Nifty Next 50 constituents (approx 2025 — verify borderline entries)
// These are the 50 stocks just outside the Nifty 50, forming the Nifty Next 50 index.

import type { Sector } from './nifty50';

export interface UniverseStock {
  symbol: string;
  name: string;
  sector: Sector;
  universe: 'nifty50' | 'niftynext50' | 'niftybank';
}

export const NIFTY_NEXT_50: UniverseStock[] = [
  // BFSI
  { symbol: 'MUTHOOTFIN.NS', name: 'Muthoot Finance', sector: 'BFSI', universe: 'niftynext50' },
  { symbol: 'CHOLAFIN.NS', name: 'Cholamandalam Investment', sector: 'BFSI', universe: 'niftynext50' },
  { symbol: 'RECLTD.NS', name: 'REC Limited', sector: 'BFSI', universe: 'niftynext50' },
  { symbol: 'PFC.NS', name: 'Power Finance Corporation', sector: 'BFSI', universe: 'niftynext50' },
  { symbol: 'ICICIPRULI.NS', name: 'ICICI Prudential Life Insurance', sector: 'BFSI', universe: 'niftynext50' },
  { symbol: 'HDFCAMC.NS', name: 'HDFC AMC', sector: 'BFSI', universe: 'niftynext50' },
  { symbol: 'NAUKRI.NS', name: 'Info Edge (Naukri)', sector: 'IT', universe: 'niftynext50' },

  // IT
  { symbol: 'PERSISTENT.NS', name: 'Persistent Systems', sector: 'IT', universe: 'niftynext50' },
  { symbol: 'COFORGE.NS', name: 'Coforge', sector: 'IT', universe: 'niftynext50' },
  { symbol: 'MPHASIS.NS', name: 'Mphasis', sector: 'IT', universe: 'niftynext50' },

  // Consumer / Retail
  { symbol: 'DMART.NS', name: 'Avenue Supermarts (D-Mart)', sector: 'CONSUMER', universe: 'niftynext50' },
  { symbol: 'ZOMATO.NS', name: 'Zomato', sector: 'CONSUMER', universe: 'niftynext50' },
  { symbol: 'NYKAA.NS', name: 'FSN E-Commerce (Nykaa)', sector: 'CONSUMER', universe: 'niftynext50' },
  { symbol: 'PAYTM.NS', name: 'One97 Communications (Paytm)', sector: 'BFSI', universe: 'niftynext50' },
  { symbol: 'TATAELXSI.NS', name: 'Tata Elxsi', sector: 'IT', universe: 'niftynext50' },
  { symbol: 'VOLTAS.NS', name: 'Voltas', sector: 'CONSUMER', universe: 'niftynext50' },
  { symbol: 'GODREJCP.NS', name: 'Godrej Consumer Products', sector: 'FMCG', universe: 'niftynext50' },
  { symbol: 'PIDILITIND.NS', name: 'Pidilite Industries', sector: 'CONSUMER', universe: 'niftynext50' },
  { symbol: 'BERGEPAINT.NS', name: 'Berger Paints India', sector: 'CONSUMER', universe: 'niftynext50' },
  { symbol: 'MARICO.NS', name: 'Marico', sector: 'FMCG', universe: 'niftynext50' },
  { symbol: 'DABUR.NS', name: 'Dabur India', sector: 'FMCG', universe: 'niftynext50' },
  { symbol: 'COLPAL.NS', name: 'Colgate-Palmolive (India)', sector: 'FMCG', universe: 'niftynext50' },

  // Pharma
  { symbol: 'TORNTPHARM.NS', name: 'Torrent Pharmaceuticals', sector: 'PHARMA', universe: 'niftynext50' },
  { symbol: 'ALKEM.NS', name: 'Alkem Laboratories', sector: 'PHARMA', universe: 'niftynext50' },
  { symbol: 'AUROPHARMA.NS', name: 'Aurobindo Pharma', sector: 'PHARMA', universe: 'niftynext50' },
  { symbol: 'DIVISLAB.NS', name: "Divi's Laboratories", sector: 'PHARMA', universe: 'niftynext50' },
  { symbol: 'MANKIND.NS', name: 'Mankind Pharma', sector: 'PHARMA', universe: 'niftynext50' },

  // Auto / Auto-ancillary
  { symbol: 'BOSCHLTD.NS', name: 'Bosch', sector: 'AUTO', universe: 'niftynext50' },
  { symbol: 'MOTHERSON.NS', name: 'Samvardhana Motherson', sector: 'AUTO', universe: 'niftynext50' },
  { symbol: 'BALKRISIND.NS', name: 'Balkrishna Industries', sector: 'AUTO', universe: 'niftynext50' },

  // Metals / Industrials
  { symbol: 'VEDL.NS', name: 'Vedanta', sector: 'METALS', universe: 'niftynext50' },
  { symbol: 'SAIL.NS', name: 'Steel Authority of India', sector: 'METALS', universe: 'niftynext50' },
  { symbol: 'NMDC.NS', name: 'NMDC', sector: 'METALS', universe: 'niftynext50' },
  { symbol: 'SIEMENS.NS', name: 'Siemens India', sector: 'INFRA', universe: 'niftynext50' },
  { symbol: 'ABB.NS', name: 'ABB India', sector: 'INFRA', universe: 'niftynext50' },

  // Cement
  { symbol: 'AMBUJACEM.NS', name: 'Ambuja Cements', sector: 'CEMENT', universe: 'niftynext50' },
  { symbol: 'ACC.NS', name: 'ACC', sector: 'CEMENT', universe: 'niftynext50' },
  { symbol: 'SHREECEM.NS', name: 'Shree Cement', sector: 'CEMENT', universe: 'niftynext50' },

  // Power / Energy
  { symbol: 'TATAPOWER.NS', name: 'Tata Power', sector: 'POWER', universe: 'niftynext50' },
  { symbol: 'ADANIGREEN.NS', name: 'Adani Green Energy', sector: 'POWER', universe: 'niftynext50' },
  { symbol: 'ADANITRANS.NS', name: 'Adani Transmission', sector: 'POWER', universe: 'niftynext50' },

  // Infra / Logistics
  { symbol: 'IRFC.NS', name: 'Indian Railway Finance Corp', sector: 'INFRA', universe: 'niftynext50' },
  { symbol: 'IRCTC.NS', name: 'Indian Railway Catering & Tourism', sector: 'INFRA', universe: 'niftynext50' },
  { symbol: 'DELHIVERY.NS', name: 'Delhivery', sector: 'INFRA', universe: 'niftynext50' },
  { symbol: 'CONCOR.NS', name: 'Container Corporation of India', sector: 'INFRA', universe: 'niftynext50' },

  // Specialty
  { symbol: 'HAVELLS.NS', name: 'Havells India', sector: 'CONSUMER', universe: 'niftynext50' },
  { symbol: 'POLYCAB.NS', name: 'Polycab India', sector: 'INFRA', universe: 'niftynext50' },
  { symbol: 'PAGEIND.NS', name: 'Page Industries (Jockey)', sector: 'CONSUMER', universe: 'niftynext50' },
  { symbol: 'INDIGO.NS', name: 'InterGlobe Aviation (IndiGo)', sector: 'INFRA', universe: 'niftynext50' },
  { symbol: 'LICI.NS', name: 'Life Insurance Corporation', sector: 'BFSI', universe: 'niftynext50' },
  { symbol: 'DLF.NS', name: 'DLF', sector: 'OTHER', universe: 'niftynext50' },
];
