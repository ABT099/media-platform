import { date, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { pgEnum, pgTable } from 'drizzle-orm/pg-core';

export const programTypeEnum = pgEnum('program_type', [
  'podcast',
  'documentary',
  'series',
]);

export const programs = pgTable('programs', {
  id: uuid().defaultRandom().primaryKey(),
  title: text().notNull(),
  description: text(),
  type: programTypeEnum().notNull(),
  category: text().notNull(),
  language: text().notNull(),
  coverImageUrl: text(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

export const episodes = pgTable('episodes', {
  id: uuid().defaultRandom().primaryKey(),
  title: text().notNull(),
  description: text(),
  programId: uuid()
    .notNull()
    .references(() => programs.id, { onDelete: 'cascade' }),
  durationInSeconds: integer().notNull(),
  publicationDate: date(),
  mediaUrl: text().notNull(),
  thumbnailUrl: text(),
  episodeNumber: integer().notNull(),
  seasonNumber: integer(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow().notNull(),
});

export type Program = typeof programs.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
