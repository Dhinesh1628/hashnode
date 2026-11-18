import {
  createPost, updatePost, deletePost, listPublishedPosts, listMyPosts, listFollowingFeed, getPostBySlug,
} from './post.service.js';
import { viewerState, withBookmarkFlags } from '../reactions/reaction.service.js';

// Controllers stay thin: read the request, call the service, shape the response.
// Express 5 leaves req.body undefined when no body was sent, hence `?? {}`.
export const postController = {
  async list(req, res) {
    res.json(await withBookmarkFlags(await listPublishedPosts(req.query), req.user));
  },

  async listMine(req, res) {
    res.json(await listMyPosts(req.user, req.query));
  },

  async followingFeed(req, res) {
    res.json(await withBookmarkFlags(await listFollowingFeed(req.user, req.query), req.user));
  },

  // `viewer` tells the client which buttons to show as active
  // (liked, bookmarked, following the author).
  async getOne(req, res) {
    const post = await getPostBySlug(req.params.slug, req.user);
    res.json({ post, viewer: await viewerState(req.user, post) });
  },

  async create(req, res) {
    res.status(201).json({ post: await createPost(req.user, req.body ?? {}) });
  },

  async update(req, res) {
    res.json({ post: await updatePost(req.user, req.params.id, req.body ?? {}) });
  },

  async remove(req, res) {
    await deletePost(req.user, req.params.id);
    res.status(204).end();
  },
};
