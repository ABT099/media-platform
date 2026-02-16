import { Module } from '@nestjs/common';
import { databaseProvider, DB } from './database.provider';

@Module({
  providers: [databaseProvider],
  exports: [DB],
})
export class DatabaseModule {}
