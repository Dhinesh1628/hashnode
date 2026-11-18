import { Router } from 'express';
import { makeAuthController } from './auth.controller.js';
import { requireAuth } from '../middleware/require-auth.js';

export function authRoutes(env) {
  const router = Router();
  const auth = makeAuthController(env);

  router.post('/register', auth.register);
  router.post('/login', auth.login);
  router.get('/me', requireAuth(env), auth.me);

  return router;
}
