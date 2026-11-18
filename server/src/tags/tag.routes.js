import { Router } from 'express';
import { listTags, getTag } from './tag.service.js';
import { listPublishedPosts } from '../posts/post.service.js';

// Tags are created implicitly when a post uses them, so the API only reads.
export function tagRoutes() {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json({ tags: await listTags() });
  });

  router.get('/:slug', async (req, res) => {
    res.json(await getTag(req.params.slug));
  });

  // Published posts with this tag, newest first. 404 if the tag doesn't exist.
  // (Same list as GET /api/posts?tag=<slug>, which the feed's filters use.)
  router.get('/:slug/posts', async (req, res) => {
    const { tag } = await getTag(req.params.slug);
    res.json({ tag, ...(await listPublishedPosts({ ...req.query, tag: tag.slug })) });
  });

  return router;
}
