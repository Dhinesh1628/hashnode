import { Router } from 'express';
import { userController as users } from './user.controller.js';
import { reactionController as reactions } from '../reactions/reaction.controller.js';
import { requireAuth, optionalAuth } from '../middleware/require-auth.js';

// Users are addressed by id. "me" routes come first so "me" isn't read as an id.
export function userRoutes(env) {
  const router = Router();
  const auth = requireAuth(env);

  router.put('/me', auth, users.updateMe);   // PRD verb
  router.patch('/me', auth, users.updateMe);
  router.get('/me/bookmarks', auth, reactions.myBookmarks);

  router.get('/:id', optionalAuth(env), users.profile);
  router.get('/:id/followers', users.followers);
  router.get('/:id/following', users.following);
  router.post('/:id/follow', auth, users.follow);
  router.delete('/:id/follow', auth, users.unfollow);

  return router;
}
