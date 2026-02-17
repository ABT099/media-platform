import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ContentProvider } from './interfaces/content-provider.interface';
import { YoutubeProvider } from './providers/youtube.provider';
import { DB, type DrizzleDB } from 'src/database/database.provider';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ProgramCreatedEvent,
  ProgramUpdatedEvent,
} from 'src/common/events/program.events';
import { EpisodeStatusChangedEvent } from 'src/common/events/episode.events';
import { ProgramsRepository } from 'src/programs/programs.repository';
import { EpisodesRepository } from 'src/episodes/episodes.repository';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);
  private providers: ContentProvider[];

  constructor(
    youtubeProvider: YoutubeProvider,
    @Inject(DB) private readonly db: DrizzleDB,
    private readonly programsRepository: ProgramsRepository,
    private readonly episodesRepository: EpisodesRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.providers = [youtubeProvider];
  }

  async importFromUrl(url: string) {
    const provider = this.providers.find((p) => p.canHandle(url));
    if (!provider) {
      throw new NotFoundException('No provider found for this URL');
    }

    const { program: programDto, episodes: episodeDtos } =
      await provider.fetchContent(url);

    const result = await this.db.transaction(async (tx) => {
      const { coverImage: _ci, ...programData } = programDto;

      const insertedProgram = await this.programsRepository.insert(
        programData,
        tx,
      );

      const episodeInserts = episodeDtos.map(
        ({ thumbnail: _t, ...ep }) => ({
          ...ep,
          programId: insertedProgram.id,
          videoUrl: null as string | null,
          status: 'draft' as const,
        }),
      );

      const insertedEpisodes =
        await this.episodesRepository.insertMany(episodeInserts, tx);

      return { program: insertedProgram, episodes: insertedEpisodes };
    });

    this.eventEmitter.emit(
      'program.created',
      new ProgramCreatedEvent(result.program),
    );

    for (const episode of result.episodes) {
      this.eventEmitter.emit(
        'episode.status_changed',
        new EpisodeStatusChangedEvent(episode),
      );
    }

    return {
      message: 'Import successful',
      programId: result.program.id,
      programTitle: result.program.title,
      episodesImported: result.episodes.length,
    };
  }
}
