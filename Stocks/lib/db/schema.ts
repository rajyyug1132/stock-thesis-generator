import { pgTable, text, jsonb, timestamp, uuid, real, boolean, pgEnum } from 'drizzle-orm/pg-core';

/* ── simulation_snapshots ──────────────────────────────────────────────────── */
export const simulationSnapshots = pgTable('simulation_snapshots', {
  id:              uuid('id').defaultRandom().primaryKey(),
  userId:          text('user_id').notNull(),            // Supabase auth UID
  name:            text('name').notNull(),               // user-given label
  symbols:         text('symbols').array().notNull(),    // ['RELIANCE','TCS']
  weights:         real('weights').array().notNull(),    // [0.5, 0.5]
  horizonDays:     real('horizon_days').notNull(),
  computedMetrics: jsonb('computed_metrics'),            // { sharpe, var95, cvar95, … }
  createdAt:       timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type SimulationSnapshot = typeof simulationSnapshots.$inferSelect;
export type NewSimulationSnapshot = typeof simulationSnapshots.$inferInsert;

/* ── watchlist ──────────────────────────────────────────────────────────────── */
export const watchlist = pgTable('watchlist', {
  id:        uuid('id').defaultRandom().primaryKey(),
  userId:    text('user_id').notNull(),
  symbol:    text('symbol').notNull(),             // e.g. 'RELIANCE.NS'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type WatchlistItem = typeof watchlist.$inferSelect;
export type NewWatchlistItem = typeof watchlist.$inferInsert;

/* ── price_alerts ───────────────────────────────────────────────────────────── */
export const alertDirectionEnum = pgEnum('alert_direction', ['above', 'below']);

export const priceAlerts = pgTable('price_alerts', {
  id:          uuid('id').defaultRandom().primaryKey(),
  userId:      text('user_id').notNull(),
  symbol:      text('symbol').notNull(),
  targetPrice: real('target_price').notNull(),
  direction:   alertDirectionEnum('direction').notNull(), // 'above' | 'below'
  label:       text('label'),                              // optional user note e.g. "Buy target"
  triggered:   boolean('triggered').default(false).notNull(),
  triggeredAt: timestamp('triggered_at', { withTimezone: true }),
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type PriceAlert = typeof priceAlerts.$inferSelect;
export type NewPriceAlert = typeof priceAlerts.$inferInsert;
