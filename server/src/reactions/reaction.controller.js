import {
  likePost, unlikePost, bookmarkPost, unbookmarkPost, listMyBookmarks,
} from './reaction.service.js';

// POST adds, DELETE removes. Both are safe to repeat.
export const reactionController = {
  async like(req, res) {
    res.json(await likePost(req.user, req.params.id));
  },
  async unlike(req, res) {
    res.json(await unlikePost(req.user, req.params.id));
  },
  async bookmark(req, res) {
    res.json(await bookmarkPost(req.user, req.params.id));
  },
  async unbookmark(req, res) {
    res.json(await unbookmarkPost(req.user, req.params.id));
  },
  async myBookmarks(req, res) {
    res.json(await listMyBookmarks(req.user, req.query));
  },
};
