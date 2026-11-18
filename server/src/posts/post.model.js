import mongoose from 'mongoose';
import { uniqueSlug } from '../lib/slugify.js';
import { makeExcerpt, readingMinutes } from '../lib/markdown-text.js';

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    slug: { type: String, required: true, unique: true },
    content: { type: String, required: true }, // raw Markdown
    excerpt: { type: String, maxlength: 250 },
    readingTime: { type: Number, default: 1 }, // minutes
    coverImage: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    // Not in the original spec: createdAt is when the draft was started,
    // which is the wrong date to show readers or to sort the feed by.
    publishedAt: { type: Date, default: null },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
  },
  { timestamps: true, toJSON: { versionKey: false } },
);

// Feed queries sort by publishedAt; tag and profile pages filter first.
postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ tags: 1, status: 1, publishedAt: -1 });
postSchema.index({ author: 1, status: 1, publishedAt: -1 });

// Every public query goes through Post.find().published().
// Drafts leaking into the feed is an automatic fail, so the rule lives
// in exactly one place instead of being repeated in every controller.
postSchema.query.published = function published() {
  return this.where({ status: 'published' });
};

postSchema.pre('validate', function derivedFields() {
  // The slug is set once and then frozen, so shared links never break
  // when the author fixes a typo in the title.
  if (!this.slug && this.title) this.slug = uniqueSlug(this.title);

  if (this.isModified('content')) {
    this.excerpt = makeExcerpt(this.content);
    this.readingTime = readingMinutes(this.content);
  }

  // First time it goes public, stamp the date. Unpublishing and
  // re-publishing keeps the original date.
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

export const Post = mongoose.model('Post', postSchema);
