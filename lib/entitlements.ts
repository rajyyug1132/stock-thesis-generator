/**
 * Paywall boundary — the single source of truth for free vs paid limits.
 *
 * No billing yet: `useUser()` stubs `isPaid = false`, so everyone is on FREE.
 * When entitlements/Stripe land, flip that one flag — these limits don't change.
 */

export interface TierLimits {
  thesesPerDay: number;   // Infinity = unlimited
  watchlistSize: number;  // Infinity = unlimited
  compareSize: number;
  portfolioSim: boolean;
  backtest: boolean;
}

export const FREE_LIMITS: TierLimits = {
  thesesPerDay: 3,
  watchlistSize: 5,
  compareSize: 2,
  portfolioSim: false,
  backtest: false,
};

export const PAID_LIMITS: TierLimits = {
  thesesPerDay: Infinity,
  watchlistSize: Infinity,
  compareSize: 5,
  portfolioSim: true,
  backtest: true,
};

/** Rows rendered in the upgrade modal — mirrors the limits above. */
export const TIER_FEATURES: { label: string; free: string; paid: string }[] = [
  { label: 'AI theses',           free: '3 / day',  paid: 'Unlimited' },
  { label: 'Watchlist',           free: '5 stocks', paid: 'Unlimited' },
  { label: 'Compare',             free: '2 stocks', paid: '5 stocks' },
  { label: 'Portfolio simulator', free: '—',        paid: 'Included' },
  { label: 'Backtesting',         free: '—',        paid: 'Included' },
];

/** Short copy explaining why the modal opened, keyed by paywall reason. */
export const UPGRADE_REASON_COPY: Record<string, string> = {
  thesis:        "You've read 3 theses today — that's the free daily limit.",
  watchlist:     'The free watchlist holds up to 5 stocks.',
  compare:       'Free comparison is limited to 2 stocks at a time.',
  portfolio_sim: 'The portfolio simulator is a Pro feature.',
  backtest:      'Backtesting is a Pro feature.',
  default:       'Upgrade to Pro to unlock everything.',
};
