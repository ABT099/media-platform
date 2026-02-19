import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

export default defineConfig({
  out: './drizzle',
  schema: './src/database/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT ?? 5432}/${DB_NAME}`,
  },
  casing: 'snake_case',
  strict: true,
  verbose: true,
});
