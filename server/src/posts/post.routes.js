import { Router } from 'express';
import { postController as posts } from './post.controller.js';
import { requireAuth, optionalAuth } from '../middleware/require-auth.js';

// Reading uses the slug (pretty, shareable URLs). Changing uses the id,
// because only the owner does it and the id never changes.
export function postRoutes(env) {
  const router = Router();
  const auth = requireAuth(env);

  router.get('/', posts.list);
  router.get('/me', auth, posts.listMine); // must come before '/:slug'
  router.get('/:slug', optionalAuth(env), posts.getOne);
  router.post('/', auth, posts.create);
  router.patch('/:id', auth, posts.update);
  router.delete('/:id', auth, posts.remove);

  return router;
}
