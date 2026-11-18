import mongoose from 'mongoose';

// "follower follows following". A separate collection (instead of arrays on
// User) so a popular author's document doesn't grow without limit.
const followSchema = new mongoose.Schema(
  {
    follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    following: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true, toJSON: { versionKey: false } },
);

followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1, createdAt: -1 });

export const Follow = mongoose.model('Follow', followSchema);
