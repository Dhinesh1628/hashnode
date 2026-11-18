import { getProfile, updateMe, followUser, unfollowUser, listConnections } from './user.service.js';

export const userController = {
  async profile(req, res) {
    res.json(await getProfile(req.params.id, req.user));
  },
  async updateMe(req, res) {
    res.json({ user: await updateMe(req.user, req.body ?? {}) });
  },
  async follow(req, res) {
    res.json(await followUser(req.user, req.params.id));
  },
  async unfollow(req, res) {
    res.json(await unfollowUser(req.user, req.params.id));
  },
  async followers(req, res) {
    res.json(await listConnections(req.params.id, 'followers', req.query));
  },
  async following(req, res) {
    res.json(await listConnections(req.params.id, 'following', req.query));
  },
};
