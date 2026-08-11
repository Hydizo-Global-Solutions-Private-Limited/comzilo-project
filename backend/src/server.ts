// Express Server Entrypoint - Reload Trigger 2026-07-30
import app from './app';
import { env } from './config/env';
import { logger } from './shared/logging/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { bootstrapDefaultData } from './database/helpers/bootstrap';

const startServer = async () => {
  try {
    // Validate database connection on startup
    await connectDatabase();

    // Auto-bootstrap system defaults (Default Tenant, Store, Domain, Super Admin)
    await bootstrapDefaultData();

    logger.info(`Attempting to bind server to env.PORT=${env.PORT} on host 0.0.0.0...`);

    const server = app.listen(env.PORT, '0.0.0.0', () => {
      logger.info(`🚀 Server running in ${env.NODE_ENV} mode on http://0.0.0.0:${env.PORT}`);
    });

    server.on('listening', () => {
      const addr = server.address();
      const bind =
        typeof addr === 'string' ? `pipe ${addr}` : `port ${addr?.port} on host ${addr?.address}`;
      logger.info(`✅ Express server actively LISTENING on ${bind}`);
    });

    server.on('error', (error: any) => {
      logger.error(`❌ Express server binding error on port ${env.PORT}:`, error);
      if (error.code === 'EADDRINUSE') {
        logger.error(`Port ${env.PORT} is already in use by another process.`);
        process.exit(1);
      }
    });

    // Graceful Shutdown Handler
    const handleGracefulShutdown = (signal: string) => {
      logger.warn(`Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed.');
        await disconnectDatabase();
        process.exit(0);
      });

      // Force shutdown after 10s if connections persist
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Fatal error during startup:', error);
    process.exit(1);
  }
};

startServer();
