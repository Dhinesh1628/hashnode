import { Router } from 'express';
import { listTags, getTag } from './tag.service.js';

// Tags are created implicitly when a post uses them, so the API only reads.
export function tagRoutes() {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json({ tags: await listTags() });
  });

  router.get('/:slug', async (req, res) => {
    res.json(await getTag(req.params.slug));
  });

  return router;
}
