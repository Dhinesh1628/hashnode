import mongoose from 'mongoose';
import { User, PUBLIC_USER_FIELDS } from './user.model.js';
import { Follow } from './follow.model.js';
import { Post } from '../posts/post.model.js';
import { addOnce } from '../reactions/reaction.service.js';
import { listPublishedPosts } from '../posts/post.service.js';
import { HttpError } from '../lib/http-error.js';
import { check } from '../lib/check.js';
import { readPagination, pageInfo } from '../lib/pagination.js';

const HTTP_URL = /^https?:\/\/\S+$/i;

async function findUser(id) {
  if (!mongoose.isValidObjectId(id)) throw HttpError.notFound('User not found');
  const user = await User.findById(id).select(`${PUBLIC_USER_FIELDS} createdAt`);
  if (!user) throw HttpError.notFound('User not found');
  return user;
}

// Public profile page: who they are, their newest published posts, their
// numbers, and whether I follow them. Never includes email or drafts.
// More pages of posts: GET /api/posts?author=<id>&page=2.
export async function getProfile(id, viewer) {
  const user = await findUser(id);
  const [latest, postCount, followers, following, isFollowing] = await Promise.all([
    listPublishedPosts({ author: String(user._id) }),
    Post.countDocuments({ author: user._id }).published(),
    Follow.countDocuments({ following: user._id }),
    Follow.countDocuments({ follower: user._id }),
    viewer ? Follow.exists({ follower: viewer._id, following: user._id }) : null,
  ]);
  return {
    user,
    posts: latest.posts,
    stats: { posts: postCount, followers, following },
    isFollowing: Boolean(isFollowing),
  };
}

// Edit my own profile. Email and password are not editable here, even if sent.
export async function updateMe(user, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw HttpError.badRequest('Request body must be a JSON object');
  }
  const v = check(body)
    .field('name', { label: 'Name', required: 'name' in body, type: 'string', max: 60 })
    .field('bio', { label: 'Bio', type: 'string', max: 200 })
    .field('avatarUrl', {
      label: 'Avatar', type: 'string', max: 500,
      pattern: HTTP_URL, patternMessage: 'Avatar must be an http(s) link',
    });
  if (!v.ok()) throw HttpError.badRequest('Please fix the highlighted fields', v.errors());

  if (body.name !== undefined) user.name = body.name.trim();
  if (body.bio !== undefined) user.bio = (body.bio ?? '').trim();
  if (body.avatarUrl !== undefined) user.avatarUrl = (body.avatarUrl ?? '').trim();
  await user.save();
  return user;
}

export async function followUser(me, id) {
  const target = await findUser(id);
  if (target._id.equals(me._id)) {
    throw HttpError.badRequest("You can't follow yourself");
  }
  await addOnce(Follow, { follower: me._id, following: target._id });
  return { following: true, followerCount: await Follow.countDocuments({ following: target._id }) };
}

export async function unfollowUser(me, id) {
  const target = await findUser(id);
  await Follow.deleteOne({ follower: me._id, following: target._id });
  return { following: false, followerCount: await Follow.countDocuments({ following: target._id }) };
}

// direction 'followers': people who follow this user.
// direction 'following': people this user follows.
export async function listConnections(id, direction, query = {}) {
  const user = await findUser(id);
  const paging = readPagination(query, { defaultLimit: 20, maxLimit: 100 });
  const [match, other] = direction === 'followers'
    ? [{ following: user._id }, 'follower']
    : [{ follower: user._id }, 'following'];

  const [rows, total] = await Promise.all([
    Follow.find(match).sort({ createdAt: -1, _id: -1 })
      .skip(paging.skip).limit(paging.limit)
      .populate({ path: other, select: PUBLIC_USER_FIELDS }),
    Follow.countDocuments(match),
  ]);
  return { users: rows.map((row) => row[other]).filter(Boolean), pagination: pageInfo(paging, total) };
}
