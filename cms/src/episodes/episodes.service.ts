import { Inject, NotFoundException } from '@nestjs/common';
import { DB, type DrizzleDB } from 'src/database/database.provider';
import { programs, episodes } from 'src/database/schema';
import { sql, eq } from 'drizzle-orm';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { UpdateEpisodeDto } from './dto/update-episode.dto';
import { SearchService } from 'src/search/search.service';

export class EpisodesService {
  constructor(
    @Inject(DB)
    private readonly db: DrizzleDB,
    private readonly searchService: SearchService,
  ) {}

  async create(programId: string, createEpisodeDto: CreateEpisodeDto) {
    // Verify program exists
    const [program] = await this.db
      .select()
      .from(programs)
      .where(eq(programs.id, programId))
      .limit(1);

    if (!program) {
      throw new NotFoundException(`Program with ID ${programId} not found`);
    }

    const [episode] = await this.db
      .insert(episodes)
      .values({
        programId,
        ...createEpisodeDto,
      })
      .returning();

    try {
      await this.searchService.indexEpisode(episode);
    } catch (error) {
      console.error(
        `CRITICAL: DB saved Episode ${episode.id}, but Indexing failed:`,
        error,
      );
    }

    return episode;
  }

  async findAll(programId: string, page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;

    const items = await this.db
      .select()
      .from(episodes)
      .where(eq(episodes.programId, programId))
      .limit(limit)
      .offset(offset)
      .orderBy(
        sql`${episodes.seasonNumber} ASC, ${episodes.episodeNumber} ASC`,
      );

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(episodes)
      .where(eq(episodes.programId, programId));

    return {
      items,
      total: Number(count),
      page,
      limit,
      totalPages: Math.ceil(Number(count) / limit),
    };
  }

  async findOne(id: string) {
    const [episode] = await this.db
      .select()
      .from(episodes)
      .where(eq(episodes.id, id))
      .limit(1);

    if (!episode) {
      throw new NotFoundException(`Episode with ID ${id} not found`);
    }

    return episode;
  }

  async update(id: string, updateEpisodeDto: UpdateEpisodeDto) {
    const [episode] = await this.db
      .update(episodes)
      .set({
        ...updateEpisodeDto,
        updatedAt: sql`now()`,
      })
      .where(eq(episodes.id, id))
      .returning();

    if (!episode) {
      throw new NotFoundException(`Episode with ID ${id} not found`);
    }

    try {
      await this.searchService.updateEpisode(episode);
    } catch (error) {
      console.error(
        `CRITICAL: DB updated Episode ${episode.id}, but Indexing failed:`,
        error,
      );
    }

    return episode;
  }

  async remove(id: string) {
    const [episode] = await this.db
      .delete(episodes)
      .where(eq(episodes.id, id))
      .returning();

    if (!episode) {
      throw new NotFoundException(`Episode with ID ${id} not found`);
    }

    try {
      await this.searchService.deleteEpisode(episode.id);
    } catch (error) {
      console.error(
        `CRITICAL: DB deleted Episode ${episode.id}, but Indexing failed:`,
        error,
      );
    }

    return { message: 'Episode deleted successfully', id };
  }
}
