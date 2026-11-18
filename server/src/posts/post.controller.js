import {
  createPost, updatePost, deletePost, listPublishedPosts, listMyPosts, getPostBySlug,
} from './post.service.js';

// Controllers stay thin: read the request, call the service, shape the response.
// Express 5 leaves req.body undefined when no body was sent, hence `?? {}`.
export const postController = {
  async list(req, res) {
    res.json(await listPublishedPosts(req.query));
  },

  async listMine(req, res) {
    res.json(await listMyPosts(req.user, req.query));
  },

  async getOne(req, res) {
    res.json({ post: await getPostBySlug(req.params.slug, req.user) });
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
