import 'dotenv/config';
import app from './app';
import { disconnectDatabase, testDatabaseConnection } from './config/database';
import config from './config/env.config';

// Validate configuration on startup
config.validate();

// Test database connection before starting server
const startServer = async () => {
  try {
    // Test database connection
    await testDatabaseConnection();
    console.log('Database connected successfully');

    const server = app.listen(config.port, () => {
      console.log(`GearUp API Server started successfully`);
      console.log(`Server running on http://localhost:${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`Health check: http://localhost:${config.port}/health`);
      if (config.nodeEnv !== 'production') {
        console.log(`API Documentation: http://localhost:${config.port}/api-docs`);
      }

      // Format date properly
      const now = new Date();
      const formattedDate = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      console.log(`Started at: ${formattedDate} at ${formattedTime}`);
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n  ${signal} received. Starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        console.log('HTTP server closed');

        try {
          // Close database connection
          await disconnectDatabase();
          console.log('Database connection closed');

          console.log('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      console.error('Unhandled Promise Rejection:', reason);
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    console.error('Failed to start server:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

// Start the server
startServer();