import { Router } from 'express';
import { postController as posts } from './post.controller.js';
import { reactionController as reactions } from '../reactions/reaction.controller.js';
import { commentController as comments } from '../comments/comment.controller.js';
import { requireAuth, optionalAuth } from '../middleware/require-auth.js';

// Reading uses the slug (pretty, shareable URLs). Changing uses the id,
// because only the owner does it and the id never changes.
export function postRoutes(env) {
  const router = Router();
  const auth = requireAuth(env);

  router.get('/', optionalAuth(env), posts.list); // logged-in readers also get bookmark flags
  // Fixed words must come before '/:slug'. Real slugs always end in a
  // random suffix ("hello-k3f9a"), so they can never equal "mine", "me" or "following".
  router.get('/mine', auth, posts.listMine); // PRD name
  router.get('/me', auth, posts.listMine);   // same list, kept for older clients
  router.get('/following', auth, posts.followingFeed);
  router.get('/:slug', optionalAuth(env), posts.getOne);
  router.post('/', auth, posts.create);
  // PUT is the PRD's verb. Both accept any subset of the fields, so the
  // editor can send everything and a script can send just { status }.
  router.put('/:id', auth, posts.update);
  router.patch('/:id', auth, posts.update);
  router.delete('/:id', auth, posts.remove);

  router.post('/:id/like', auth, reactions.like);
  router.delete('/:id/like', auth, reactions.unlike);
  router.post('/:id/bookmark', auth, reactions.bookmark);
  router.delete('/:id/bookmark', auth, reactions.unbookmark);

  router.get('/:id/comments', comments.list);
  router.post('/:id/comments', auth, comments.create);

  return router;
}
