import { Router } from 'express';
import { Post, PUBLISHED } from '../posts/post.model.js';

// Public site numbers for the home page: published posts, people who have
// published at least once, and tags used by a published post. Counted live
// from the database, so the home page never shows made-up figures.
export async function siteStats() {
  const [posts, writers, topics] = await Promise.all([
    Post.countDocuments(PUBLISHED),
    Post.distinct('author', PUBLISHED),
    Post.distinct('tags', PUBLISHED),
  ]);
  return { posts, writers: writers.length, topics: topics.length };
}

export function statsRoutes() {
  const router = Router();
  router.get('/', async (_req, res) => {
    res.json(await siteStats());
  });
  return router;
}
