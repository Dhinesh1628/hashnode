import { Tag } from './tag.model.js';
import { Post, PUBLISHED } from '../posts/post.model.js';
import { HttpError } from '../lib/http-error.js';

// Tags with how many *published* posts use them, most used first.
// Counting from posts (not storing a counter on the tag) means the number
// can't drift, and a tag used only by drafts never shows up at all.
export function listTags() {
  return Post.aggregate([
    { $match: PUBLISHED },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', postCount: { $sum: 1 } } },
    { $sort: { postCount: -1, _id: 1 } },
    { $limit: 100 },
    { $lookup: { from: Tag.collection.name, localField: '_id', foreignField: '_id', as: 'tag' } },
    { $unwind: '$tag' },
    { $project: { _id: '$tag._id', name: '$tag.name', slug: '$tag.slug', postCount: 1 } },
  ]);
}

// One tag's header info. Its posts come from GET /api/posts?tag=<slug>.
export async function getTag(slug) {
  const tag = await Tag.findOne({ slug: String(slug).toLowerCase() });
  if (!tag) throw HttpError.notFound('Tag not found');
  const postCount = await Post.countDocuments({ tags: tag._id }).published();
  return { tag, postCount };
}
