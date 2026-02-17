import { Module } from '@nestjs/common';
import { ProgramsService } from './programs.service';
import { ProgramsController } from './programs.controller';
import { DatabaseModule } from '../database/database.module';
import { StorageModule } from '../storage/storage.module';
import { ProgramsRepository } from './programs.repository';
import { EpisodesModule } from '../episodes/episodes.module';

@Module({
  imports: [DatabaseModule, StorageModule, EpisodesModule],
  controllers: [ProgramsController],
  providers: [ProgramsRepository, ProgramsService],
  exports: [ProgramsRepository, ProgramsService],
})
export class ProgramsModule {}
