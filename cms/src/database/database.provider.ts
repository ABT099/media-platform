import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export const DB = Symbol('DB');
export type DrizzleDB = NodePgDatabase<typeof schema>;

export const databaseProvider: Provider = {
  provide: DB,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const connectionString = configService.get<string>('DATABASE_URL');

    if (!connectionString) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }

    const pool = new Pool({
      connectionString,
    });

    const db = drizzle({
      client: pool,
      schema,
      casing: 'snake_case',
    });

    return db;
  },
};
