import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { makeAuthController } from './auth.controller.js';
import { requireAuth, optionalAuth } from '../middleware/require-auth.js';
import { HttpError } from '../lib/http-error.js';

export function authRoutes(env) {
  const router = Router();
  const auth = makeAuthController(env);

  // Slows down password guessing and mass sign-ups: each IP address gets
  // env.authRateLimit attempts per 15 minutes across login and register.
  const limitAttempts = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.authRateLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler(_req, _res, next) {
      next(HttpError.tooManyRequests('Too many attempts. Please wait a few minutes and try again.'));
    },
  });

  router.post('/register', limitAttempts, auth.register);
  router.post('/login', limitAttempts, auth.login);
  router.post('/logout', auth.logout);
  router.get('/me', requireAuth(env), auth.me);
  router.get('/session', optionalAuth(env), auth.session);

  return router;
}
