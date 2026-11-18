import mongoose from 'mongoose';
import { Post } from './post.model.js';
import { Tag } from '../tags/tag.model.js';
import { HttpError } from '../lib/http-error.js';
import { check } from '../lib/check.js';
import { escapeRegex } from '../lib/escape-regex.js';
import { readPagination, pageInfo } from '../lib/pagination.js';

// What other people may see about an author. Email is deliberately missing.
const AUTHOR_PUBLIC = 'name avatarUrl bio';
const POPULATE = [
  { path: 'author', select: AUTHOR_PUBLIC },
  { path: 'tags', select: 'name slug' },
];
const STATUSES = ['draft', 'published'];
const HTTP_URL = /^https?:\/\/\S+$/i;

// partial = true for PATCH: only the fields that were sent are checked,
// but a field that *is* sent can't be blank.
function validatePostBody(body, { partial }) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw HttpError.badRequest('Request body must be a JSON object');
  }
  const errors = check(body)
    .field('title', { label: 'Title', required: !partial || 'title' in body, type: 'string', max: 150 })
    .field('content', { label: 'Content', required: !partial || 'content' in body, type: 'string', max: 100_000 })
    .field('coverImage', {
      label: 'Cover image', type: 'string', max: 500,
      pattern: HTTP_URL, patternMessage: 'Cover image must be an http(s) link',
    })
    .errors();

  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    errors.status = 'Status must be "draft" or "published"';
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || body.tags.some((t) => typeof t !== 'string')) {
      errors.tags = 'Tags must be a list of words';
    } else if (body.tags.length > 5) {
      errors.tags = 'Use at most 5 tags';
    } else if (body.tags.some((t) => !/[a-z0-9]/i.test(t))) {
      errors.tags = 'Each tag needs at least one letter or number';
    }
  }

  if (Object.keys(errors).length) throw HttpError.badRequest('Please fix the highlighted fields', errors);
}

// Copies only the fields an author may change. author, slug, publishedAt,
// excerpt and readingTime can't be set from the request body, even if sent.
async function applyChanges(post, body) {
  if (body.title !== undefined) post.title = body.title.trim();
  if (body.content !== undefined) post.content = body.content;
  if (body.coverImage !== undefined) post.coverImage = body.coverImage.trim();
  if (body.status !== undefined) post.status = body.status;
  if (body.tags !== undefined) post.tags = await Tag.resolveNames(body.tags);
}

// Loads a post for editing. 404 if it doesn't exist, 403 if it isn't yours.
async function findOwnPost(user, id) {
  if (!mongoose.isValidObjectId(id)) throw HttpError.notFound('Post not found');
  const post = await Post.findById(id);
  if (!post) throw HttpError.notFound('Post not found');
  if (!post.author.equals(user._id)) throw HttpError.forbidden('You can only change your own posts');
  return post;
}

export async function createPost(user, body) {
  validatePostBody(body, { partial: false });
  const post = new Post({ author: user._id });
  await applyChanges(post, body);
  await post.save();
  return post.populate(POPULATE);
}

export async function updatePost(user, id, body) {
  const post = await findOwnPost(user, id);
  validatePostBody(body, { partial: true });
  await applyChanges(post, body);
  await post.save();
  return post.populate(POPULATE);
}

export async function deletePost(user, id) {
  const post = await findOwnPost(user, id);
  await post.deleteOne();
}

// Public feed: published posts only, newest first.
// Optional filters: ?tag=<slug>  ?author=<userId>  ?q=<search text>
export async function listPublishedPosts(query = {}) {
  const paging = readPagination(query);
  const filter = {};

  if (query.tag) {
    const tag = await Tag.findOne({ slug: String(query.tag).toLowerCase() });
    if (!tag) return { posts: [], pagination: pageInfo(paging, 0) };
    filter.tags = tag._id;
  }
  if (query.author) {
    if (!mongoose.isValidObjectId(String(query.author))) {
      throw HttpError.badRequest('Please fix the highlighted fields', { author: 'Not a valid user id' });
    }
    filter.author = String(query.author);
  }
  const q = String(query.q ?? '').trim().slice(0, 100);
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: pattern }, { content: pattern }];
  }

  const [posts, total] = await Promise.all([
    Post.find(filter).published()
      .sort({ publishedAt: -1, _id: -1 })
      .skip(paging.skip).limit(paging.limit)
      .select('-content') // lists show the excerpt; the full text is only on the post page
      .populate(POPULATE),
    Post.countDocuments(filter).published(),
  ]);
  return { posts, pagination: pageInfo(paging, total) };
}

// The author's dashboard: their own posts, drafts included. ?status= narrows it.
export async function listMyPosts(user, query = {}) {
  const paging = readPagination(query);
  const filter = { author: user._id };
  if (query.status !== undefined) {
    if (!STATUSES.includes(query.status)) {
      throw HttpError.badRequest('Please fix the highlighted fields', { status: 'Status must be "draft" or "published"' });
    }
    filter.status = query.status;
  }

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip(paging.skip).limit(paging.limit)
      .select('-content')
      .populate(POPULATE),
    Post.countDocuments(filter),
  ]);
  return { posts, pagination: pageInfo(paging, total) };
}

// A single post page. Everyone sees published posts. A draft is visible only
// to its author (for previewing); to anyone else it simply doesn't exist (404),
// so even the fact that the draft exists isn't revealed.
export async function getPostBySlug(slug, viewer) {
  let post = await Post.findOne({ slug }).published().populate(POPULATE);
  if (!post && viewer) post = await Post.findOne({ slug, author: viewer._id }).populate(POPULATE);
  if (!post) throw HttpError.notFound('Post not found');
  return post;
}
