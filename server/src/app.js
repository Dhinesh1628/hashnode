import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { authRoutes } from './auth/auth.routes.js';
import { postRoutes } from './posts/post.routes.js';
import { tagRoutes } from './tags/tag.routes.js';
import { userRoutes } from './users/user.routes.js';
import { commentRoutes } from './comments/comment.routes.js';
import { notFoundRoute, errorHandler } from './middleware/error-handler.js';

// Serves the built React site: real files from dist/, and index.html for any
// other page URL (/post/hello-k3f9a) so React Router can show the right page.
function serveClient(app, distDir) {
  const indexFile = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexFile)) {
    throw new Error(`CLIENT_DIST is set, but ${indexFile} doesn't exist. Run "npm run build" in client/ first.`);
  }

  // Vite puts a content hash in every asset name (index-Ab12.js), so a
  // changed file gets a new name and the old one can be cached forever.
  app.use('/assets', express.static(path.join(distDir, 'assets'), { immutable: true, maxAge: '1y', fallthrough: false }));
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));

  app.get(/^(?!\/api(\/|$)).*/, (_req, res) => {
    res.set('Cache-Control', 'no-cache'); // always check for a new deploy
    res.sendFile(indexFile);
  });
}

// Building the app in a function (instead of at import time) lets the
// tests create an app with test settings, without opening a port.
export function createApp(env) {
  const app = express();

  // On Render the app sits behind one proxy. Trusting it gives the real
  // visitor IP (needed for rate limiting) and lets secure cookies work.
  if (env.isProduction) app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        // Cover images and avatars are links to other sites.
        'img-src': ["'self'", 'data:', 'https:'],
      },
    },
  }));
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' })); // posts are text; 1 MB is plenty

  app.get('/api/health', (_req, res) => {
    const dbUp = mongoose.connection.readyState === 1;
    res.status(dbUp ? 200 : 503).json({ ok: dbUp });
  });
  app.use('/api/auth', authRoutes(env));
  app.use('/api/posts', postRoutes(env));
  app.use('/api/tags', tagRoutes(env));
  app.use('/api/users', userRoutes(env));
  app.use('/api/comments', commentRoutes(env));

  if (env.clientDist) serveClient(app, env.clientDist);

  app.use(notFoundRoute);
  app.use(errorHandler);
  return app;
}
