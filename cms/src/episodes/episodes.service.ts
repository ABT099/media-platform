import { Inject, NotFoundException } from '@nestjs/common';
import { DB, type DrizzleDB } from 'src/database/database.provider';
import { programs, episodes } from 'src/database/schema';
import { sql, eq, and, lte, gte } from 'drizzle-orm';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { UpdateEpisodeDto } from './dto/update-episode.dto';
import { SearchService } from 'src/search/search.service';
import { Injectable } from '@nestjs/common';
import { StorageService } from 'src/storage/storage.service';
import { PublicationService } from './publication.service';

@Injectable()
export class EpisodesService {
  constructor(
    @Inject(DB)
    private readonly db: DrizzleDB,
    private readonly searchService: SearchService,
    private readonly storageService: StorageService,
    private readonly publicationService: PublicationService,
  ) {}

  async create(
    programId: string,
    createEpisodeDto: CreateEpisodeDto,
    thumbnail?: Express.Multer.File,
  ) {
    // Verify program exists
    const [program] = await this.db
      .select()
      .from(programs)
      .where(eq(programs.id, programId))
      .limit(1);

    if (!program) {
      throw new NotFoundException(`Program with ID ${programId} not found`);
    }

    // Upload thumbnail if provided
    let thumbnailUrl: string | undefined;
    if (thumbnail) {
      thumbnailUrl = await this.storageService.uploadPublicFile(
        thumbnail,
        'thumbnails',
      );
    }

    // Extract thumbnail from DTO to avoid inserting it as a field
    const { thumbnail: _, ...episodeData } = createEpisodeDto;

    // Determine initial status based on publication date
    const initialStatus = this.publicationService.determineStatus(
      createEpisodeDto.publicationDate,
      false, // No video yet
    );

    const [episode] = await this.db
      .insert(episodes)
      .values({
        programId,
        ...episodeData,
        thumbnailUrl,
        status: initialStatus,
        videoUrl: null,
      })
      .returning();

    return episode;
  }

  async markAsUploaded(episodeId: string, s3Key: string) {
    const videoUrl = this.storageService.getPublicUrl(s3Key);

    // Get current episode to check publication date
    const [currentEpisode] = await this.db
      .select()
      .from(episodes)
      .where(eq(episodes.id, episodeId))
      .limit(1);

    if (!currentEpisode) {
      console.error(
        `Received upload event for non-existent episode: ${episodeId}`,
      );
      return;
    }

    // Determine status based on publication date
    const newStatus = this.publicationService.determineStatus(
      currentEpisode.publicationDate,
      true, // Video now exists
    );

    const [updatedEpisode] = await this.db
      .update(episodes)
      .set({
        status: newStatus,
        videoUrl: videoUrl,
        updatedAt: new Date(),
      })
      .where(eq(episodes.id, episodeId))
      .returning();

    // Only index if published immediately (not scheduled)
    if (newStatus === 'published') {
      try {
        await this.searchService.indexEpisode(updatedEpisode!);
        console.log(`Successfully indexed Episode ${episodeId}`);
      } catch (error) {
        console.error(`Indexing failed for Episode ${episodeId}:`, error);
      }
    } else {
      console.log(
        `Episode ${episodeId} scheduled for publication at ${currentEpisode.publicationDate}`,
      );
    }
  }

  async findAll(
    programId: string,
    page: number = 1,
    limit: number = 10,
    status?: 'draft' | 'scheduled' | 'published',
    publishedAfter?: Date,
    publishedBefore?: Date,
  ) {
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(episodes.programId, programId)];

    if (status) {
      conditions.push(eq(episodes.status, status));
    }

    if (publishedAfter) {
      conditions.push(gte(episodes.publicationDate, publishedAfter));
    }

    if (publishedBefore) {
      conditions.push(lte(episodes.publicationDate, publishedBefore));
    }

    const whereClause =
      conditions.length > 1 ? and(...conditions) : conditions[0];

    const items = await this.db
      .select()
      .from(episodes)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(
        sql`${episodes.seasonNumber} ASC, ${episodes.episodeNumber} ASC`,
      );

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(episodes)
      .where(whereClause);

    return {
      items,
      total: Number(count),
      page,
      limit,
      totalPages: Math.ceil(Number(count) / limit),
    };
  }

  async findPublished(
    programId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.findAll(programId, page, limit, 'published');
  }

  async findScheduled(
    programId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.findAll(programId, page, limit, 'scheduled');
  }

  async findByPublicationDateRange(
    programId: string,
    startDate: Date,
    endDate: Date,
    page: number = 1,
    limit: number = 10,
  ) {
    return this.findAll(programId, page, limit, undefined, startDate, endDate);
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

  async update(
    id: string,
    updateEpisodeDto: UpdateEpisodeDto,
    thumbnail?: Express.Multer.File,
  ) {
    // Get current episode to check video and publication date
    const [currentEpisode] = await this.db
      .select()
      .from(episodes)
      .where(eq(episodes.id, id))
      .limit(1);

    if (!currentEpisode) {
      throw new NotFoundException(`Episode with ID ${id} not found`);
    }

    // Upload thumbnail if provided
    let thumbnailUrl: string | undefined;
    if (thumbnail) {
      thumbnailUrl = await this.storageService.uploadPublicFile(
        thumbnail,
        'thumbnails',
      );
    }

    // Extract thumbnail from DTO to avoid inserting it as a field
    const { thumbnail: _, publicationDate, ...episodeData } = updateEpisodeDto;

    // Determine status if publicationDate is being updated
    // If publicationDate is explicitly provided (including null), use it; otherwise keep current
    const finalPublicationDate =
      'publicationDate' in updateEpisodeDto
        ? publicationDate
        : currentEpisode.publicationDate;
    const hasVideo = !!currentEpisode.videoUrl;
    const newStatus = this.publicationService.determineStatus(
      finalPublicationDate,
      hasVideo,
    );

    const updateData: any = {
      ...episodeData,
      ...(thumbnailUrl && { thumbnailUrl }),
      status: newStatus,
      updatedAt: new Date(),
    };

    // Handle publicationDate explicitly - if provided (including null), update it
    if ('publicationDate' in updateEpisodeDto) {
      updateData.publicationDate = publicationDate;
    }

    const [episode] = await this.db
      .update(episodes)
      .set(updateData)
      .where(eq(episodes.id, id))
      .returning();

    try {
      // Only update search index if published
      if (episode.status === 'published') {
        await this.searchService.updateEpisode(episode);
      }
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
