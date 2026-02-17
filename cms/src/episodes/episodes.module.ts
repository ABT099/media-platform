import { Module } from '@nestjs/common';
import { EpisodesService } from './episodes.service';
import { EpisodesController } from './episodes.controller';
import { DatabaseModule } from '../database/database.module';
import { EpisodeUploadListener } from './episode-upload.listener';
import { StorageModule } from '../storage/storage.module';
import { PublicationService } from './publication.service';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [DatabaseModule, StorageModule, SearchModule],
  controllers: [EpisodesController],
  providers: [EpisodesService, EpisodeUploadListener, PublicationService],
  exports: [EpisodesService, PublicationService],
})
export class EpisodesModule {}
