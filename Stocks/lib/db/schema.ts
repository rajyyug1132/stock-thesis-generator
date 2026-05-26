import { pgTable, text, jsonb, timestamp, uuid, real } from 'drizzle-orm/pg-core';

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
