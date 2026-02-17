import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DB, type DrizzleDB } from 'src/database/database.provider';
import { episodes, type Episode } from 'src/database/schema';
import { eq, and, lte } from 'drizzle-orm';
import { SearchService } from 'src/search/search.service';

@Injectable()
export class PublicationService {
  constructor(
    @Inject(DB) private readonly db: DrizzleDB,
    private readonly searchService: SearchService,
  ) {}

  determineStatus(
    publicationDate: Date | null | undefined,
    hasVideo: boolean,
  ): 'draft' | 'scheduled' | 'published' {
    if (!hasVideo) {
      return 'draft';
    }

    if (!publicationDate) {
      return 'published'; // No date means publish immediately if video exists
    }

    const now = new Date();
    const pubDate = new Date(publicationDate);

    if (pubDate > now) {
      return 'scheduled';
    }

    return 'published';
  }

  canPublish(episode: Episode): boolean {
    return !!episode.videoUrl;
  }

  async schedulePublication(
    episodeId: string,
    publicationDate: Date,
  ): Promise<Episode> {
    const [episode] = await this.db
      .select()
      .from(episodes)
      .where(eq(episodes.id, episodeId))
      .limit(1);

    if (!episode) {
      throw new NotFoundException(`Episode with ID ${episodeId} not found`);
    }

    if (!this.canPublish(episode)) {
      throw new BadRequestException(
        'Episode must have a video before it can be scheduled',
      );
    }

    const status = this.determineStatus(publicationDate, true);

    const [updatedEpisode] = await this.db
      .update(episodes)
      .set({
        status,
        publicationDate,
        updatedAt: new Date(),
      })
      .where(eq(episodes.id, episodeId))
      .returning();

    return updatedEpisode!;
  }

  async publishNow(episodeId: string): Promise<Episode> {
    const [episode] = await this.db
      .select()
      .from(episodes)
      .where(eq(episodes.id, episodeId))
      .limit(1);

    if (!episode) {
      throw new NotFoundException(`Episode with ID ${episodeId} not found`);
    }

    if (!this.canPublish(episode)) {
      throw new BadRequestException(
        'Episode must have a video before it can be published',
      );
    }

    const [updatedEpisode] = await this.db
      .update(episodes)
      .set({
        status: 'published',
        publicationDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(episodes.id, episodeId))
      .returning();

    try {
      await this.searchService.indexEpisode(updatedEpisode!);
    } catch (error) {
      console.error(
        `CRITICAL: Episode ${episodeId} published, but indexing failed:`,
        error,
      );
    }

    return updatedEpisode!;
  }

  async cancelSchedule(episodeId: string): Promise<Episode> {
    const [episode] = await this.db
      .select()
      .from(episodes)
      .where(eq(episodes.id, episodeId))
      .limit(1);

    if (!episode) {
      throw new NotFoundException(`Episode with ID ${episodeId} not found`);
    }

    if (episode.status !== 'scheduled') {
      throw new BadRequestException(
        'Episode is not scheduled for publication',
      );
    }

    const [updatedEpisode] = await this.db
      .update(episodes)
      .set({
        status: 'draft',
        publicationDate: null,
        updatedAt: new Date(),
      })
      .where(eq(episodes.id, episodeId))
      .returning();

    return updatedEpisode!;
  }

  /**
   * Processes scheduled episodes that are ready to be published
   */
  async processScheduledPublications(): Promise<number> {
    const now = new Date();

    const scheduledEpisodes = await this.db
      .select()
      .from(episodes)
      .where(
        and(
          eq(episodes.status, 'scheduled'),
          lte(episodes.publicationDate, now),
        ),
      );

    let publishedCount = 0;

    for (const episode of scheduledEpisodes) {
      if (!this.canPublish(episode)) {
        console.warn(
          `Episode ${episode.id} is scheduled but has no video. Skipping.`,
        );
        continue;
      }

      try {
        const [updatedEpisode] = await this.db
          .update(episodes)
          .set({
            status: 'published',
            updatedAt: new Date(),
          })
          .where(eq(episodes.id, episode.id))
          .returning();

        await this.searchService.indexEpisode(updatedEpisode!);
        publishedCount++;
        console.log(`Published scheduled episode ${episode.id}`);
      } catch (error) {
        console.error(
          `Failed to publish scheduled episode ${episode.id}:`,
          error,
        );
      }
    }

    return publishedCount;
  }
}
