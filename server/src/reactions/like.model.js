import mongoose from 'mongoose';

// One document per (user, post). The unique index is what makes
// "like twice" impossible, even with two clicks at the same moment.
const likeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  },
  { timestamps: true, toJSON: { versionKey: false } },
);

likeSchema.index({ user: 1, post: 1 }, { unique: true });
likeSchema.index({ post: 1 });

export const Like = mongoose.model('Like', likeSchema);
