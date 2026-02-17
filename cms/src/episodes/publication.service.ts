import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { type Episode } from 'src/database/schema';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EpisodeStatusChangedEvent } from 'src/common/events/episode.events';
import { EpisodesRepository } from './episodes.repository';

@Injectable()
export class PublicationService {
  private readonly logger = new Logger(PublicationService.name);

  constructor(
    private readonly episodesRepository: EpisodesRepository,
    private readonly eventEmitter: EventEmitter2,
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
    const episode = await this.episodesRepository.findById(episodeId);

    if (!episode) {
      throw new NotFoundException(`Episode with ID ${episodeId} not found`);
    }

    if (!this.canPublish(episode)) {
      throw new BadRequestException(
        'Episode must have a video before it can be scheduled',
      );
    }

    const status = this.determineStatus(publicationDate, true);

    const updatedEpisode = await this.episodesRepository.update(episodeId, {
      status,
      publicationDate,
      updatedAt: new Date(),
    });

    return updatedEpisode!;
  }

  async publishNow(episodeId: string): Promise<Episode> {
    const episode = await this.episodesRepository.findById(episodeId);

    if (!episode) {
      throw new NotFoundException(`Episode with ID ${episodeId} not found`);
    }

    if (!this.canPublish(episode)) {
      throw new BadRequestException(
        'Episode must have a video before it can be published',
      );
    }

    const updatedEpisode = await this.episodesRepository.update(episodeId, {
      status: 'published',
      publicationDate: new Date(),
      updatedAt: new Date(),
    });

    this.eventEmitter.emit(
      'episode.status_changed',
      new EpisodeStatusChangedEvent(updatedEpisode!),
    );

    return updatedEpisode!;
  }

  async cancelSchedule(episodeId: string): Promise<Episode> {
    const episode = await this.episodesRepository.findById(episodeId);

    if (!episode) {
      throw new NotFoundException(`Episode with ID ${episodeId} not found`);
    }

    if (episode.status !== 'scheduled') {
      throw new BadRequestException(
        'Episode is not scheduled for publication',
      );
    }

    const updatedEpisode = await this.episodesRepository.update(episodeId, {
      status: 'draft',
      publicationDate: null,
      updatedAt: new Date(),
    });

    return updatedEpisode!;
  }

  async processScheduledPublications(): Promise<number> {
    const now = new Date();
    const scheduledEpisodes =
      await this.episodesRepository.findScheduledReadyToPublish(now);

    if (scheduledEpisodes.length === 0) return 0;

    // Separate publishable from non-publishable episodes
    const publishableIds: string[] = [];
    for (const episode of scheduledEpisodes) {
      if (this.canPublish(episode)) {
        publishableIds.push(episode.id);
      } else {
        this.logger.warn(
          `Episode ${episode.id} is scheduled but has no video. Skipping.`,
        );
      }
    }

    if (publishableIds.length === 0) return 0;

    // Batch update all eligible episodes in a single query
    const updatedEpisodes = await this.episodesRepository.publishMany(
      publishableIds,
      now,
    );

    // Emit status_changed events for all published episodes (fire-and-forget)
    for (const episode of updatedEpisodes) {
      this.eventEmitter.emit(
        'episode.status_changed',
        new EpisodeStatusChangedEvent(episode),
      );
    }

    return updatedEpisodes.length;
  }
}
