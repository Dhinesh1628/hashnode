import { listComments, addComment, updateComment, deleteComment } from './comment.service.js';

export const commentController = {
  async list(req, res) {
    res.json(await listComments(req.params.id, req.query));
  },
  async create(req, res) {
    res.status(201).json({ comment: await addComment(req.user, req.params.id, req.body ?? {}) });
  },
  async update(req, res) {
    res.json({ comment: await updateComment(req.user, req.params.id, req.body ?? {}) });
  },
  async remove(req, res) {
    await deleteComment(req.user, req.params.id);
    res.status(204).end();
  },
};
