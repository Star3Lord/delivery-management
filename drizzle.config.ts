import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL_DIRECT)
  throw new Error('DATABASE_URL_DIRECT is not set');

export default defineConfig({
  schema: './src/lib/server/db/schema/index.ts',
  schemaFilter: ['CRUSHER'],
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL_DIRECT },
  verbose: true,
  strict: true,
});
