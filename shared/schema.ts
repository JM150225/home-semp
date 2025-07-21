import { pgTable, serial, varchar, integer, timestamp, text } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Tabla para almacenar visitantes únicos
export const visitors = pgTable('visitors', {
  id: serial('id').primaryKey(),
  ip: varchar('ip', { length: 45 }).notNull(),
  country: varchar('country', { length: 100 }),
  countryCode: varchar('country_code', { length: 2 }),
  region: varchar('region', { length: 100 }),
  city: varchar('city', { length: 100 }),
  timezone: varchar('timezone', { length: 100 }),
  org: text('org'),
  userAgent: text('user_agent'),
  firstVisit: timestamp('first_visit').defaultNow().notNull(),
  lastVisit: timestamp('last_visit').defaultNow().notNull(),
  visitCount: integer('visit_count').default(1).notNull(),
});

// Tabla para estadísticas por país
export const countryStats = pgTable('country_stats', {
  id: serial('id').primaryKey(),
  country: varchar('country', { length: 100 }).notNull().unique(),
  countryCode: varchar('country_code', { length: 2 }),
  totalVisitors: integer('total_visitors').default(0).notNull(),
  lastUpdate: timestamp('last_update').defaultNow().notNull(),
});

// Tabla para estadísticas globales
export const globalStats = pgTable('global_stats', {
  id: serial('id').primaryKey(),
  totalVisitors: integer('total_visitors').default(0).notNull(),
  totalCountries: integer('total_countries').default(0).notNull(),
  lastUpdate: timestamp('last_update').defaultNow().notNull(),
});

// Relaciones
export const visitorsRelations = relations(visitors, ({ one }) => ({
  countryInfo: one(countryStats, {
    fields: [visitors.country],
    references: [countryStats.country],
  }),
}));

export const countryStatsRelations = relations(countryStats, ({ many }) => ({
  visitors: many(visitors),
}));

// Tipos TypeScript
export type Visitor = typeof visitors.$inferSelect;
export type InsertVisitor = typeof visitors.$inferInsert;
export type CountryStats = typeof countryStats.$inferSelect;
export type InsertCountryStats = typeof countryStats.$inferInsert;
export type GlobalStats = typeof globalStats.$inferSelect;
export type InsertGlobalStats = typeof globalStats.$inferInsert;