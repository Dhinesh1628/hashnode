import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRoutes } from './auth/auth.routes.js';
import { notFoundRoute, errorHandler } from './middleware/error-handler.js';

// Building the app in a function (instead of at import time) lets the
// tests create an app with test settings, without opening a port.
export function createApp(env) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.clientOrigin }));
  app.use(express.json({ limit: '1mb' })); // posts are text; 1 MB is plenty

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes(env));

  app.use(notFoundRoute);
  app.use(errorHandler);
  return app;
}
