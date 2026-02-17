import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PublicationScheduler } from './publication-scheduler.service';
import { DatabaseModule } from '../database/database.module';
import { EpisodesModule } from '../episodes/episodes.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    EpisodesModule,
  ],
  providers: [PublicationScheduler],
})
export class SchedulerModule {}
