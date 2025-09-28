import dotenv from 'dotenv';
import app from './app';
import { logger } from './config/logger';
import Database from './config/database';
import BlockchainService from './config/blockchain';

// Load environment variables
dotenv.config();

const PORT = process.env.API_PORT || 3001;
const HOST = process.env.API_HOST || 'localhost';

async function startServer() {
  try {
    // Initialize database connection
    logger.info('Connecting to database...');
    await Database.connect();

    // Initialize blockchain connection
    logger.info('Connecting to blockchain...');
    await BlockchainService.connect();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 API Server running on http://${HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Database: ${Database.isHealthy() ? 'Connected' : 'Disconnected'}`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await Database.disconnect();
          logger.info('Database disconnected');
        } catch (error) {
          logger.error('Error disconnecting from database:', error);
        }

        logger.info('Graceful shutdown completed');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();