import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import approvalRoutes from './routes/approvalRoutes.js';
import ruleRoutes from './routes/ruleRoutes.js';
import ocrRoutes from './routes/ocrRoutes.js';
import metaRoutes from './routes/metaRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import { getMockEmailLog } from './services/mockNotificationService.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.frontendUrl,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));

  const uploadDir = path.resolve(env.uploadDir);
  app.use('/uploads', express.static(uploadDir));

  app.get('/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/expenses', expenseRoutes);
  app.use('/api', approvalRoutes);
  app.use('/api/rules', ruleRoutes);
  app.use('/api/ocr', ocrRoutes);
  app.use('/api/meta', metaRoutes);
  app.use('/api/analytics', analyticsRoutes);

  app.get('/api/mock/emails', (_req, res) => {
    res.json(getMockEmailLog());
  });

  app.use(errorHandler);
  return app;
}
