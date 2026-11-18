import mongoose from 'mongoose';
import { Comment } from './comment.model.js';
import { Post } from '../posts/post.model.js';
import { PUBLIC_USER_FIELDS } from '../users/user.model.js';
import { findPublishedPostById } from '../posts/post.service.js';
import { HttpError } from '../lib/http-error.js';
import { check } from '../lib/check.js';
import { readPagination, pageInfo } from '../lib/pagination.js';

const AUTHOR = { path: 'author', select: PUBLIC_USER_FIELDS };

function validateComment(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw HttpError.badRequest('Request body must be a JSON object');
  }
  const v = check(body).field('content', { label: 'Comment', required: true, type: 'string', max: 2000 });
  if (!v.ok()) throw HttpError.badRequest('Please fix the highlighted fields', v.errors());
}

async function findComment(id) {
  if (!mongoose.isValidObjectId(id)) throw HttpError.notFound('Comment not found');
  const comment = await Comment.findById(id);
  if (!comment) throw HttpError.notFound('Comment not found');
  return comment;
}

// Oldest first, like a conversation. Comments on a draft can't be read.
export async function listComments(postId, query = {}) {
  const post = await findPublishedPostById(postId);
  const paging = readPagination(query, { defaultLimit: 20, maxLimit: 100 });
  const [comments, total] = await Promise.all([
    Comment.find({ post: post._id }).sort({ createdAt: 1, _id: 1 })
      .skip(paging.skip).limit(paging.limit).populate(AUTHOR),
    Comment.countDocuments({ post: post._id }),
  ]);
  return { comments, pagination: pageInfo(paging, total) };
}

export async function addComment(user, postId, body) {
  validateComment(body);
  const post = await findPublishedPostById(postId);
  const comment = await Comment.create({ post: post._id, author: user._id, content: body.content.trim() });
  await Post.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } });
  return comment.populate(AUTHOR);
}

// Only the person who wrote a comment can edit it.
export async function updateComment(user, id, body) {
  const comment = await findComment(id);
  if (!comment.author.equals(user._id)) throw HttpError.forbidden('You can only edit your own comments');
  validateComment(body);
  comment.content = body.content.trim();
  await comment.save();
  return comment.populate(AUTHOR);
}

// The comment's writer can delete it, and so can the post's author
// (moderating their own post). Nobody else can.
export async function deleteComment(user, id) {
  const comment = await findComment(id);
  if (!comment.author.equals(user._id)) {
    const post = await Post.findById(comment.post).select('author');
    if (!post || !post.author.equals(user._id)) {
      throw HttpError.forbidden('You can only delete your own comments, or comments on your posts');
    }
  }
  const { deletedCount } = await Comment.deleteOne({ _id: comment._id });
  if (deletedCount) await Post.updateOne({ _id: comment.post }, { $inc: { commentCount: -1 } });
}
