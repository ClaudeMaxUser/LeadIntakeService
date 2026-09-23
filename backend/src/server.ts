import { createApp } from './app.js';
import { config } from './config/index.js';
import { pool } from './db/index.js';
import { runMigrations } from './db/migrate.js';

async function bootstrap() {
  const app = createApp();

  // Automatically apply database migrations on startup
  try {
    await runMigrations();
  } catch (err: any) {
    console.error('⚠️ Automatic database migration failed on boot:', err.message);
    if (config.NODE_ENV === 'production') {
      console.warn('Continuing boot process — please ensure migrations are run.');
    }
  }

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
