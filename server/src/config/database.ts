// ABOUTME: MongoDB connection manager using Mongoose — connects to Atlas with event listeners.
// ABOUTME: Exports connectDatabase() for server startup and disconnectDatabase() for graceful shutdown.

import mongoose from 'mongoose';
import { config } from './environment';
import logger from '../shared/logger';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.MONGODB_URI);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection failed', { error });
    process.exit(1);
  }

  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB connection error', { error });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected gracefully');
}
