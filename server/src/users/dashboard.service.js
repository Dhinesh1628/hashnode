import { Post, PUBLISHED } from '../posts/post.model.js';
import { Comment } from '../comments/comment.model.js';
import { Follow } from './follow.model.js';
import { PUBLIC_USER_FIELDS } from './user.model.js';

const NEW_COMMENT_DAYS = 7;

// Everything the author dashboard shows above the post list, in one request:
//   stats          counts and totals for the stat cards
//   drafts         the 3 most recently edited drafts ("Finish a draft")
//   recentComments the 5 newest comments other people left on my published posts
//   newComments    how many of those arrived in the last 7 days
// Only the logged-in user's own data is read, so nothing can leak between users.
export async function getDashboard(user) {
  const mine = { author: user._id };

  const [statusCounts, totals, followers, drafts, publishedIds] = await Promise.all([
    Post.aggregate([{ $match: mine }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Post.aggregate([
      { $match: { ...mine, ...PUBLISHED } },
      { $group: { _id: null, likes: { $sum: '$likeCount' }, comments: { $sum: '$commentCount' } } },
    ]),
    Follow.countDocuments({ following: user._id }),
    Post.find({ ...mine, status: 'draft' }).sort({ updatedAt: -1 }).limit(3).select('title slug updatedAt'),
    Post.find(mine).published().distinct('_id'),
  ]);

  // Comments on drafts aren't shown: a draft that was published and then
  // unpublished keeps its comments, but they shouldn't surface here.
  const othersOnMyPosts = { post: { $in: publishedIds }, author: { $ne: user._id } };
  const since = new Date(Date.now() - NEW_COMMENT_DAYS * 24 * 60 * 60 * 1000);
  const [recentComments, newComments] = await Promise.all([
    Comment.find(othersOnMyPosts)
      .sort({ createdAt: -1, _id: -1 })
      .limit(5)
      .populate({ path: 'author', select: PUBLIC_USER_FIELDS })
      .populate({ path: 'post', select: 'title slug' }),
    Comment.countDocuments({ ...othersOnMyPosts, createdAt: { $gte: since } }),
  ]);

  const count = (status) => statusCounts.find((s) => s._id === status)?.count ?? 0;
  return {
    stats: {
      published: count('published'),
      drafts: count('draft'),
      likes: totals[0]?.likes ?? 0,
      comments: totals[0]?.comments ?? 0,
      followers,
    },
    drafts,
    recentComments,
    newComments,
  };
}
