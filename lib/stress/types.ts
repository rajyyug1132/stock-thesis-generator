export type ShockSpec = {
  rationale: string;
  scenarioName: string;
  shocks: {
    symbol: string;
    initialPriceShock?: number;
    driftMultiplier?: number;
    volMultiplier?: number;
  }[];
  correlationAdjustments?: {
    pair: [string, string];
    newCorrelation: number;
  }[];
  confidence: 'high' | 'medium' | 'low';
};
