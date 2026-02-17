import {
  index,
  integer,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { pgEnum, pgTable } from 'drizzle-orm/pg-core';

export const programTypeEnum = pgEnum('program_type', [
  'podcast',
  'documentary',
  'series',
]);

export const languageEnum = pgEnum('language_code', ['ar', 'en']);

export const programs = pgTable(
  'programs',
  {
    id: uuid().defaultRandom().primaryKey(),
    title: text().notNull(),
    description: text(),
    type: programTypeEnum().notNull(),
    category: text().notNull(),
    language: languageEnum().notNull(),
    coverImageUrl: text(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp().defaultNow(),
  },
  (table) => [
    index('programs_category_idx').on(table.category),
    index('programs_type_idx').on(table.type),
  ],
);

export const episodes = pgTable(
  'episodes',
  {
    id: uuid().defaultRandom().primaryKey(),
    title: text().notNull(),
    description: text(),
    programId: uuid()
      .notNull()
      .references(() => programs.id, { onDelete: 'cascade' }),
    durationInSeconds: integer().notNull(),
    publicationDate: timestamp(),
    mediaUrl: text().notNull(),
    thumbnailUrl: text(),
    episodeNumber: integer().notNull(),
    seasonNumber: integer(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp().defaultNow(),
  },
  (table) => [
    index('episodes_program_id_idx').on(table.programId),
    uniqueIndex('unique_episode_per_season').on(
      table.programId,
      table.seasonNumber,
      table.episodeNumber,
    ),
  ],
);

export type Program = typeof programs.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
