import { createApp } from './app.js';
import { config } from './config/index.js';
import { pool } from './db/index.js';
import { runMigrations } from './db/migrate.js';
import { seedDatabase } from './db/seed.js';

async function bootstrap() {
  // 1. Run migrations before starting the HTTP server
  console.log('🔄 Executing database migrations...');
  await runMigrations();

  // 2. Check and auto-seed initial data if database is empty
  try {
    const { rows } = await pool.query('SELECT COUNT(*) as count FROM leads');
    if (parseInt(rows[0]?.count || '0', 10) === 0) {
      console.log('🌱 Database is empty. Auto-seeding initial leads...');
      await seedDatabase();
    }
  } catch (seedErr: any) {
    console.warn('⚠️ Auto-seed notice:', seedErr.message);
  }

  // 3. Start HTTP server only after migrations have succeeded
  const app = createApp();

  const server = app.listen(config.PORT, '0.0.0.0', () => {
    console.log(`🚀 Lead Intake Backend listening on 0.0.0.0:${config.PORT} [${config.NODE_ENV}]`);
  });

  // Graceful shutdown handling
  const gracefulShutdown = (signal: string) => {
    console.log(`\nReceived ${signal}, starting graceful shutdown...`);
    server.close(async () => {
      console.log('HTTP server closed.');
      try {
        await pool.end();
        console.log('Database pool drained.');
        process.exit(0);
      } catch (err) {
        console.error('Error during pool draining:', err);
        process.exit(1);
      }
    });

    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});
