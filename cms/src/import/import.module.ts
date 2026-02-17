import { Module } from '@nestjs/common';
import { ImportService } from './import.service';
import { ImportController } from './import.controller';
import { YoutubeProvider } from './providers/youtube.provider';
import { DatabaseModule } from '../database/database.module';
import { ProgramsModule } from '../programs/programs.module';
import { EpisodesModule } from '../episodes/episodes.module';

@Module({
  imports: [DatabaseModule, ProgramsModule, EpisodesModule],
  controllers: [ImportController],
  providers: [ImportService, YoutubeProvider],
})
export class ImportModule {}
