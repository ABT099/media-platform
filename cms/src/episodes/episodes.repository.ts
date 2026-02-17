import { Inject, Injectable } from '@nestjs/common';
import { DB, type DrizzleDB } from 'src/database/database.provider';
import { episodes } from 'src/database/schema';
import type { Episode } from 'src/database/schema';
import { and, eq, gte, inArray, lte, sql, SQL } from 'drizzle-orm';

export interface FindEpisodesOptions {
  programId?: string;
  status?: 'draft' | 'scheduled' | 'published';
  publishedAfter?: Date;
  publishedBefore?: Date;
}

@Injectable()
export class EpisodesRepository {
  constructor(@Inject(DB) private readonly db: DrizzleDB) {}

  private buildConditions(
    options: FindEpisodesOptions,
  ): SQL<boolean> | undefined {
    const conditions: SQL<boolean>[] = [];

    if (options.programId) {
      conditions.push(eq(episodes.programId, options.programId) as SQL<boolean>);
    }
    if (options.status) {
      conditions.push(eq(episodes.status, options.status) as SQL<boolean>);
    }
    if (options.publishedAfter) {
      conditions.push(
        gte(episodes.publicationDate, options.publishedAfter) as SQL<boolean>,
      );
    }
    if (options.publishedBefore) {
      conditions.push(
        lte(episodes.publicationDate, options.publishedBefore) as SQL<boolean>,
      );
    }

    if (conditions.length === 0) return undefined;
    if (conditions.length === 1) return conditions[0];
    return and(...conditions) as SQL<boolean>;
  }

  async findById(id: string): Promise<Episode | undefined> {
    const [episode] = await this.db
      .select()
      .from(episodes)
      .where(eq(episodes.id, id))
      .limit(1);
    return episode;
  }

  async findByProgramId(programId: string): Promise<Episode[]> {
    return this.db
      .select()
      .from(episodes)
      .where(eq(episodes.programId, programId))
      .orderBy(
        sql`${episodes.seasonNumber} ASC, ${episodes.episodeNumber} ASC`,
      );
  }

  async findMany(
    options: FindEpisodesOptions,
    offset: number,
    limit: number,
  ): Promise<Episode[]> {
    const where = this.buildConditions(options);
    return this.db
      .select()
      .from(episodes)
      .where(where)
      .limit(limit)
      .offset(offset)
      .orderBy(
        sql`${episodes.seasonNumber} ASC, ${episodes.episodeNumber} ASC`,
      );
  }

  async count(options: FindEpisodesOptions): Promise<number> {
    const where = this.buildConditions(options);
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(episodes)
      .where(where);
    return Number(count);
  }

  async insert(
    data: Omit<typeof episodes.$inferInsert, 'id'>,
    tx?: DrizzleDB,
  ): Promise<Episode> {
    const db = tx ?? this.db;
    const [episode] = await db.insert(episodes).values(data).returning();
    return episode!;
  }

  async insertMany(
    data: Omit<typeof episodes.$inferInsert, 'id'>[],
    tx?: DrizzleDB,
  ): Promise<Episode[]> {
    if (data.length === 0) return [];
    const db = tx ?? this.db;
    return db.insert(episodes).values(data).returning();
  }

  async update(
    id: string,
    data: Partial<typeof episodes.$inferInsert>,
  ): Promise<Episode | undefined> {
    const [episode] = await this.db
      .update(episodes)
      .set(data)
      .where(eq(episodes.id, id))
      .returning();
    return episode;
  }

  async delete(id: string): Promise<Episode | undefined> {
    const [episode] = await this.db
      .delete(episodes)
      .where(eq(episodes.id, id))
      .returning();
    return episode;
  }

  async publishMany(
    ids: string[],
    updatedAt: Date,
  ): Promise<Episode[]> {
    if (ids.length === 0) return [];
    return this.db
      .update(episodes)
      .set({ status: 'published', updatedAt })
      .where(inArray(episodes.id, ids))
      .returning();
  }

  async findScheduledReadyToPublish(now: Date): Promise<Episode[]> {
    return this.db
      .select()
      .from(episodes)
      .where(
        and(
          eq(episodes.status, 'scheduled'),
          lte(episodes.publicationDate, now),
        ),
      );
  }
}
