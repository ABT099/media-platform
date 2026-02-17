import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { UpdateEpisodeDto } from './dto/update-episode.dto';
import { StorageService } from 'src/storage/storage.service';
import { PublicationService } from './publication.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EpisodeStatusChangedEvent,
  EpisodeDeletedEvent,
} from 'src/common/events/episode.events';
import { EpisodesRepository } from './episodes.repository';
import {
  buildPaginatedResult,
  toOffset,
} from 'src/common/pagination/paginate';

@Injectable()
export class EpisodesService {
  private readonly logger = new Logger(EpisodesService.name);

  constructor(
    private readonly episodesRepository: EpisodesRepository,
    private readonly storageService: StorageService,
    private readonly publicationService: PublicationService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    programId: string,
    createEpisodeDto: CreateEpisodeDto,
    thumbnail?: Express.Multer.File,
  ) {
    let thumbnailUrl: string | undefined;
    if (thumbnail) {
      thumbnailUrl = await this.storageService.uploadPublicFile(
        thumbnail,
        'thumbnails',
      );
    }

    const { thumbnail: _, ...episodeData } = createEpisodeDto;

    const initialStatus = this.publicationService.determineStatus(
      createEpisodeDto.publicationDate,
      false,
    );

    try {
      const episode = await this.episodesRepository.insert({
        programId,
        ...episodeData,
        thumbnailUrl,
        status: initialStatus,
        videoUrl: null,
      });

      const upload =
        await this.storageService.generateDefaultPresignedUrl(episode.id);

      return { ...episode, upload };
    } catch (error) {
      // PostgreSQL FK violation: programId does not exist
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === '23503'
      ) {
        throw new NotFoundException(`Program with ID ${programId} not found`);
      }
      throw error;
    }
  }

  async markAsUploaded(episodeId: string, s3Key: string) {
    const videoUrl = this.storageService.getPublicUrl(s3Key);

    const currentEpisode = await this.episodesRepository.findById(episodeId);

    if (!currentEpisode) {
      this.logger.error(
        `Received upload event for non-existent episode: ${episodeId}`,
      );
      return;
    }

    const newStatus = this.publicationService.determineStatus(
      currentEpisode.publicationDate,
      true,
    );

    const updatedEpisode = await this.episodesRepository.update(episodeId, {
      status: newStatus,
      videoUrl,
      updatedAt: new Date(),
    });

    this.eventEmitter.emit(
      'episode.status_changed',
      new EpisodeStatusChangedEvent(updatedEpisode!),
    );
  }

  async findAll(
    programId: string,
    page: number = 1,
    limit: number = 10,
    status?: 'draft' | 'scheduled' | 'published',
    publishedAfter?: Date,
    publishedBefore?: Date,
  ) {
    const offset = toOffset(page, limit);
    const options = { programId, status, publishedAfter, publishedBefore };

    const [items, total] = await Promise.all([
      this.episodesRepository.findMany(options, offset, limit),
      this.episodesRepository.count(options),
    ]);

    return buildPaginatedResult(items, total, page, limit);
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
    return this.findAll(
      programId,
      page,
      limit,
      undefined,
      startDate,
      endDate,
    );
  }

  async findOne(id: string) {
    const episode = await this.episodesRepository.findById(id);

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
    const currentEpisode = await this.episodesRepository.findById(id);

    if (!currentEpisode) {
      throw new NotFoundException(`Episode with ID ${id} not found`);
    }

    let thumbnailUrl: string | undefined;
    if (thumbnail) {
      thumbnailUrl = await this.storageService.uploadPublicFile(
        thumbnail,
        'thumbnails',
      );
    }

    const { thumbnail: _, publicationDate, ...episodeData } = updateEpisodeDto;

    const finalPublicationDate =
      'publicationDate' in updateEpisodeDto
        ? publicationDate
        : currentEpisode.publicationDate;
    const hasVideo = !!currentEpisode.videoUrl;
    const newStatus = this.publicationService.determineStatus(
      finalPublicationDate,
      hasVideo,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      ...episodeData,
      ...(thumbnailUrl && { thumbnailUrl }),
      status: newStatus,
      updatedAt: new Date(),
    };

    if ('publicationDate' in updateEpisodeDto) {
      updateData.publicationDate = publicationDate;
    }

    const episode = await this.episodesRepository.update(id, updateData);

    this.eventEmitter.emit(
      'episode.status_changed',
      new EpisodeStatusChangedEvent(episode!),
    );

    return episode;
  }

  async remove(id: string) {
    const episode = await this.episodesRepository.delete(id);

    if (!episode) {
      throw new NotFoundException(`Episode with ID ${id} not found`);
    }

    this.eventEmitter.emit(
      'episode.deleted',
      new EpisodeDeletedEvent(episode.id),
    );

    return { message: 'Episode deleted successfully', id };
  }
}
