import { Like } from './like.model.js';
import { Bookmark } from './bookmark.model.js';
import { Post } from '../posts/post.model.js';
import { Follow } from '../users/follow.model.js';
import { findPublishedPostById, POST_POPULATE } from '../posts/post.service.js';
import { readPagination, pageInfo } from '../lib/pagination.js';

// Inserts `doc` unless it already exists. Returns true only if it was new.
// Liking twice is not an error: the second like simply changes nothing.
export async function addOnce(Model, doc) {
  try {
    const result = await Model.updateOne(doc, { $setOnInsert: doc }, { upsert: true });
    return result.upsertedCount === 1;
  } catch (err) {
    if (err?.code === 11000) return false; // two requests raced; the other one inserted it
    throw err;
  }
}

async function changeLikeCount(postId, by) {
  const post = await Post.findByIdAndUpdate(postId, { $inc: { likeCount: by } }, { new: true });
  return post.likeCount;
}

export async function likePost(user, postId) {
  const post = await findPublishedPostById(postId);
  const added = await addOnce(Like, { user: user._id, post: post._id });
  return { liked: true, likeCount: added ? await changeLikeCount(post._id, 1) : post.likeCount };
}

export async function unlikePost(user, postId) {
  const post = await findPublishedPostById(postId);
  const { deletedCount } = await Like.deleteOne({ user: user._id, post: post._id });
  return { liked: false, likeCount: deletedCount ? await changeLikeCount(post._id, -1) : post.likeCount };
}

export async function bookmarkPost(user, postId) {
  const post = await findPublishedPostById(postId);
  await addOnce(Bookmark, { user: user._id, post: post._id });
  return { bookmarked: true };
}

export async function unbookmarkPost(user, postId) {
  const post = await findPublishedPostById(postId);
  await Bookmark.deleteOne({ user: user._id, post: post._id });
  return { bookmarked: false };
}

// My bookmarks, most recently saved first. A bookmarked post that its author
// later unpublished is skipped, so bookmarks can't be used to read drafts.
export async function listMyBookmarks(user, query = {}) {
  const paging = readPagination(query);
  const marks = await Bookmark.find({ user: user._id }).sort({ createdAt: -1, _id: -1 }).select('post').lean();
  const savedIds = marks.map((m) => m.post);

  const visible = await Post.find({ _id: { $in: savedIds } }).published().select('_id').lean();
  const visibleSet = new Set(visible.map((p) => String(p._id)));
  const ordered = savedIds.filter((id) => visibleSet.has(String(id)));

  const pageIds = ordered.slice(paging.skip, paging.skip + paging.limit);
  const posts = await Post.find({ _id: { $in: pageIds } }).published().select('-content').populate(POST_POPULATE);
  const order = new Map(pageIds.map((id, i) => [String(id), i]));
  posts.sort((a, b) => order.get(String(a._id)) - order.get(String(b._id)));

  return { posts, pagination: pageInfo(paging, ordered.length) };
}

// What the current visitor has done with this post, for the like/bookmark/
// follow buttons on the post page. Anonymous visitors get all false.
export async function viewerState(viewer, post) {
  if (!viewer) return { liked: false, bookmarked: false, followingAuthor: false };
  const authorId = post.author._id ?? post.author;
  const [liked, bookmarked, followingAuthor] = await Promise.all([
    Like.exists({ user: viewer._id, post: post._id }),
    Bookmark.exists({ user: viewer._id, post: post._id }),
    Follow.exists({ follower: viewer._id, following: authorId }),
  ]);
  return { liked: Boolean(liked), bookmarked: Boolean(bookmarked), followingAuthor: Boolean(followingAuthor) };
}
