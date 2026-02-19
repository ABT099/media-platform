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
    const host = configService.getOrThrow<string>('DB_HOST');
    const port = configService.getOrThrow<string>('DB_PORT');
    const name = configService.getOrThrow<string>('DB_NAME');
    const user = configService.getOrThrow<string>('DB_USER');
    const password = configService.getOrThrow<string>('DB_PASSWORD');

    const pool = new Pool({
      host,
      port: Number(port),
      database: name,
      user,
      password,
    });

    const db = drizzle({
      client: pool,
      schema,
      casing: 'snake_case',
    });

    return db;
  },
};
