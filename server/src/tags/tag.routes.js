import { Router } from 'express';
import { listTags, getTag } from './tag.service.js';
import { listPublishedPosts } from '../posts/post.service.js';
import { withBookmarkFlags } from '../reactions/reaction.service.js';
import { optionalAuth } from '../middleware/require-auth.js';

// Tags are created implicitly when a post uses them, so the API only reads.
export function tagRoutes(env) {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json({ tags: await listTags() });
  });

  router.get('/:slug', async (req, res) => {
    res.json(await getTag(req.params.slug));
  });

  // Published posts with this tag, newest first. 404 if the tag doesn't exist.
  // (Same list as GET /api/posts?tag=<slug>, which the feed's filters use.)
  router.get('/:slug/posts', optionalAuth(env), async (req, res) => {
    const { tag } = await getTag(req.params.slug);
    const list = await withBookmarkFlags(await listPublishedPosts({ ...req.query, tag: tag.slug }), req.user);
    res.json({ tag, ...list });
  });

  return router;
}
