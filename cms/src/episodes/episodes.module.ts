import { Module } from '@nestjs/common';
import { EpisodesService } from './episodes.service';
import { EpisodesController } from './episodes.controller';
import { DatabaseModule } from '../database/database.module';
import { EpisodeUploadListener } from './episode-upload.listener';
import { StorageModule } from '../storage/storage.module';
import { PublicationService } from './publication.service';
import { EpisodesRepository } from './episodes.repository';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [EpisodesController],
  providers: [
    EpisodesRepository,
    EpisodesService,
    EpisodeUploadListener,
    PublicationService,
  ],
  exports: [EpisodesRepository, EpisodesService, PublicationService],
})
export class EpisodesModule {}
