import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { ProgramsModule } from './programs/programs.module';
import { EpisodesModule } from './episodes/episodes.module';
import { SearchModule } from './search/search.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ImportModule } from './import/import.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    DatabaseModule,
    AuthModule,
    ProgramsModule,
    EpisodesModule,
    SearchModule,
    SchedulerModule,
    ImportModule,
    EventEmitterModule.forRoot(),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
