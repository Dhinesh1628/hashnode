import mongoose from 'mongoose';

// Private "read later" list. Same shape and uniqueness rule as Like.
const bookmarkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  },
  { timestamps: true, toJSON: { versionKey: false } },
);

bookmarkSchema.index({ user: 1, post: 1 }, { unique: true });
bookmarkSchema.index({ user: 1, createdAt: -1 });
bookmarkSchema.index({ post: 1 });

export const Bookmark = mongoose.model('Bookmark', bookmarkSchema);
