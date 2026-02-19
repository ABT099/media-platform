import {
  index,
  integer,
  jsonb,
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

export const statusEnum = pgEnum('status', ['draft', 'scheduled', 'published']);

export const users = pgTable('users', {
  id: uuid().defaultRandom().primaryKey(),
  email: text().notNull().unique(),
  passwordHash: text().notNull(),
  name: text(),
  createdAt: timestamp().defaultNow().notNull(),
  updatedAt: timestamp().defaultNow(),
});

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
    extraInfo: jsonb(),
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
    videoUrl: text(),
    thumbnailUrl: text(),
    episodeNumber: integer().notNull(),
    seasonNumber: integer(),
    extraInfo: jsonb(),
    createdAt: timestamp().defaultNow().notNull(),
    updatedAt: timestamp().defaultNow(),
    status: statusEnum().notNull().default('draft'),
  },
  (table) => [
    index('episodes_program_id_idx').on(table.programId),
    index('episodes_status_idx').on(table.status),
    index('episodes_publication_date_idx').on(table.publicationDate),
    index('episodes_status_publication_date_idx').on(
      table.status,
      table.publicationDate,
    ),
    uniqueIndex('unique_episode_per_season').on(
      table.programId,
      table.seasonNumber,
      table.episodeNumber,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type Program = typeof programs.$inferSelect;
export type Episode = typeof episodes.$inferSelect;
