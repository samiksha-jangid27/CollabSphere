// ABOUTME: Test Express app configured identically to index.ts but without .listen().
// ABOUTME: Used by Supertest for integration testing against the full middleware stack.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { errorHandler } from '@/middleware/errorHandler';
import authRoutes from '@/modules/auth/auth.routes';
import profileRoutes from '@/modules/profile/profile.routes';
import geocodeRoutes from '@/modules/geocode/geocode.routes';

const app = express();

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/profiles', profileRoutes);
app.use('/api/v1/geocode', geocodeRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

export { app };
