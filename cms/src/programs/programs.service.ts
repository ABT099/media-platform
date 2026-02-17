import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { DB, type DrizzleDB } from 'src/database/database.provider';
import { CreateProgramDto } from './dto/create-program.dto';
import { programs, episodes } from 'src/database/schema';
import { sql, eq } from 'drizzle-orm';
import { UpdateProgramDto } from './dto/update-program.dto';
import { SearchService } from '../search/search.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class ProgramsService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    private readonly searchService: SearchService,
    private readonly storageService: StorageService,
  ) {}

  async create(
    data: CreateProgramDto,
    coverImage?: Express.Multer.File,
  ) {
    // Upload cover image if provided
    let coverImageUrl: string | undefined;
    if (coverImage) {
      coverImageUrl = await this.storageService.uploadPublicFile(
        coverImage,
        'thumbnails',
      );
    }

    // Extract coverImage from DTO to avoid inserting it as a field
    const { coverImage: _, ...programData } = data;

    const [program] = await this.db
      .insert(programs)
      .values({
        ...programData,
        coverImageUrl,
      })
      .returning();

    try {
      await this.searchService.indexProgram(program);
    } catch (error) {
      console.error(
        `CRITICAL: DB created Program ${program.id}, but Indexing failed:`,
        error,
      );
    }

    return program;
  }

  async findAll(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;

    const items = await this.db
      .select()
      .from(programs)
      .limit(limit)
      .offset(offset)
      .orderBy(sql`${programs.createdAt} DESC`);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(programs);

    return {
      items,
      total: Number(count),
      page,
      limit,
      totalPages: Math.ceil(Number(count) / limit),
    };
  }

  async findOne(id: string) {
    const [program] = await this.db
      .select()
      .from(programs)
      .where(eq(programs.id, id))
      .limit(1);

    if (!program) {
      throw new NotFoundException(`Program with ID ${id} not found`);
    }

    const episodeResults = await this.db
      .select()
      .from(episodes)
      .where(eq(episodes.programId, id))
      .orderBy(
        sql`${episodes.seasonNumber} ASC, ${episodes.episodeNumber} ASC`,
      );

    return {
      ...program,
      episodes: episodeResults,
    };
  }

  async update(
    id: string,
    data: UpdateProgramDto,
    coverImage?: Express.Multer.File,
  ) {
    // Upload cover image if provided
    let coverImageUrl: string | undefined;
    if (coverImage) {
      coverImageUrl = await this.storageService.uploadPublicFile(
        coverImage,
        'thumbnails',
      );
    }

    // Extract coverImage from DTO to avoid inserting it as a field
    const { coverImage: _, ...programData } = data;

    const [program] = await this.db
      .update(programs)
      .set({
        ...programData,
        ...(coverImageUrl && { coverImageUrl }),
        updatedAt: new Date(),
      })
      .where(eq(programs.id, id))
      .returning();

    if (!program) {
      throw new NotFoundException(`Program with ID ${id} not found`);
    }

    try {
      await this.searchService.updateProgram(program);
    } catch (error) {
      console.error(
        `CRITICAL: DB updated Program ${program.id}, but Indexing failed:`,
        error,
      );
    }

    return program;
  }

  async remove(id: string) {
    const [program] = await this.db
      .delete(programs)
      .where(eq(programs.id, id))
      .returning();

    if (!program) {
      throw new NotFoundException(`Program with ID ${id} not found`);
    }

    try {
      await this.searchService.deleteProgram(program.id);
    } catch (error) {
      console.error(
        `CRITICAL: DB deleted Program ${program.id}, but Indexing failed:`,
        error,
      );
    }

    return { message: 'Program deleted successfully', id };
  }
}
