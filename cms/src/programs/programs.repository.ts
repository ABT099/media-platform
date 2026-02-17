import { Inject, Injectable } from '@nestjs/common';
import { DB, type DrizzleDB } from 'src/database/database.provider';
import { programs } from 'src/database/schema';
import type { Program } from 'src/database/schema';
import { eq, sql } from 'drizzle-orm';

@Injectable()
export class ProgramsRepository {
  constructor(@Inject(DB) private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<Program | undefined> {
    const [program] = await this.db
      .select()
      .from(programs)
      .where(eq(programs.id, id))
      .limit(1);
    return program;
  }

  async findAll(offset: number, limit: number): Promise<Program[]> {
    return this.db
      .select()
      .from(programs)
      .limit(limit)
      .offset(offset)
      .orderBy(sql`${programs.createdAt} DESC`);
  }

  async count(): Promise<number> {
    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(programs);
    return Number(count);
  }

  async insert(
    data: Omit<typeof programs.$inferInsert, 'id'>,
    tx?: DrizzleDB,
  ): Promise<Program> {
    const db = tx ?? this.db;
    const [program] = await db.insert(programs).values(data).returning();
    return program!;
  }

  async update(
    id: string,
    data: Partial<typeof programs.$inferInsert>,
  ): Promise<Program | undefined> {
    const [program] = await this.db
      .update(programs)
      .set(data)
      .where(eq(programs.id, id))
      .returning();
    return program;
  }

  async delete(id: string): Promise<Program | undefined> {
    const [program] = await this.db
      .delete(programs)
      .where(eq(programs.id, id))
      .returning();
    return program;
  }
}
