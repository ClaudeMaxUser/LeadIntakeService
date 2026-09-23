import runner from 'node-pg-migrate';
import path from 'path';
import { config } from '../config/index.js';

export async function runMigrations(): Promise<void> {
  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  console.log(`Running database migrations from: ${migrationsDir}`);
  await runner({
    databaseUrl: config.DATABASE_URL,
    dir: migrationsDir,
    direction: 'up',
    migrationsTable: 'pgmigrations',
    verbose: false,
    log: (msg: string) => console.log(`[Migration] ${msg}`),
  });
  console.log('✅ Database schema is up to date.');
}

