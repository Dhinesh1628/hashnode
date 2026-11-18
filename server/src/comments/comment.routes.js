import { Router } from 'express';
import { commentController as comments } from './comment.controller.js';
import { requireAuth } from '../middleware/require-auth.js';

// Listing and adding comments live under /api/posts/:id/comments.
// Editing and deleting a single comment live here, at /api/comments/:id.
export function commentRoutes(env) {
  const router = Router();
  const auth = requireAuth(env);

  router.patch('/:id', auth, comments.update);
  router.delete('/:id', auth, comments.remove);

  return router;
}
