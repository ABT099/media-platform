import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle',
  schema: './src/database/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      'postgres://admin:password@localhost:5432/media_platform',
  },
  casing: 'snake_case',
  strict: true,
  verbose: true,
});
