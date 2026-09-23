import { createApp } from './app.js';
import { config } from './config/index.js';
import { pool } from './db/index.js';

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(`🚀 Lead Intake Backend listening on port ${config.PORT} [${config.NODE_ENV}]`);
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

  // Force close after 10s if graceful fails
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
