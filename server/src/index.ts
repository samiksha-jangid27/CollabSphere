// ABOUTME: Express server entry point — configures middleware stack, mounts routes, starts server.
// ABOUTME: Follows the layered middleware order from the API spec: cors → helmet → json → cookie → routes → errors.

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/environment';
import { connectDatabase } from './config/database';
import { setupSocketServer } from './config/socket';
import { API_PREFIX } from './shared/constants';
import { apiLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import profileRoutes from './modules/profile/profile.routes';
import geocodeRoutes from './modules/geocode/geocode.routes';
import searchRoutes from './modules/search/search.routes';
import collaborationRoutes from './modules/collaboration/collaboration.routes';
import messagingRoutes from './modules/messaging/messaging.routes';
import { MessagingService } from './modules/messaging/messaging.service';
import { MessagingRepository } from './modules/messaging/messaging.repository';
import logger from './shared/logger';

const app = express();
const httpServer = createServer(app);
setupSocketServer(httpServer);

// Global middleware — CORS must be before everything else
app.use(cors({
  origin: config.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(apiLimiter);

// Routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/profiles`, profileRoutes);
app.use(`${API_PREFIX}/geocode`, geocodeRoutes);
app.use(`${API_PREFIX}/search`, searchRoutes);
app.use(`${API_PREFIX}/collaborations`, collaborationRoutes);
app.use(`${API_PREFIX}/messages`, messagingRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler (must be last)
app.use(errorHandler);

// Wire EventBus subscriptions
const messagingRepo = new MessagingRepository();
const messagingService = new MessagingService(messagingRepo);
MessagingService.subscribeToEvents(messagingService);

// Start server (skipped in test — supertest creates its own ephemeral server)
async function start() {
  if (config.isTest) return;

  await connectDatabase();
  httpServer.listen(config.PORT, () => {
    logger.info(`Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
  });
}

start().catch((error) => {
  logger.error('Failed to start server', { error });
  process.exit(1);
});

export { app, httpServer };
