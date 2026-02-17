import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SearchService } from './search.service';
import {
  ProgramCreatedEvent,
  ProgramUpdatedEvent,
  ProgramDeletedEvent,
} from 'src/common/events/program.events';
import {
  EpisodeStatusChangedEvent,
  EpisodeDeletedEvent,
} from 'src/common/events/episode.events';

@Injectable()
export class SearchIndexListener {
  private readonly logger = new Logger(SearchIndexListener.name);

  constructor(private readonly searchService: SearchService) {}

  @OnEvent('program.created')
  async handleProgramCreated(event: ProgramCreatedEvent) {
    try {
      await this.searchService.indexProgram(event.program);
    } catch (error) {
      this.logger.error(
        `CRITICAL: Failed to index Program ${event.program.id}`,
        error,
      );
    }
  }

  @OnEvent('program.updated')
  async handleProgramUpdated(event: ProgramUpdatedEvent) {
    try {
      await this.searchService.updateProgram(event.program);
    } catch (error) {
      this.logger.error(
        `CRITICAL: Failed to update index for Program ${event.program.id}`,
        error,
      );
    }
  }

  @OnEvent('program.deleted')
  async handleProgramDeleted(event: ProgramDeletedEvent) {
    try {
      await this.searchService.deleteProgram(event.programId);
    } catch (error) {
      this.logger.error(
        `CRITICAL: Failed to delete Program ${event.programId} from index`,
        error,
      );
    }
  }

  @OnEvent('episode.status_changed')
  async handleEpisodeStatusChanged(event: EpisodeStatusChangedEvent) {
    try {
      await this.searchService.updateEpisode(event.episode);
    } catch (error) {
      this.logger.error(
        `CRITICAL: Failed to update index for Episode ${event.episode.id}`,
        error,
      );
    }
  }

  @OnEvent('episode.deleted')
  async handleEpisodeDeleted(event: EpisodeDeletedEvent) {
    try {
      await this.searchService.deleteEpisode(event.episodeId);
    } catch (error) {
      this.logger.error(
        `CRITICAL: Failed to delete Episode ${event.episodeId} from index`,
        error,
      );
    }
  }
}
