import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 2000 }, // plain text / Markdown
  },
  { timestamps: true, toJSON: { versionKey: false } },
);

// A post's comments are always read oldest-first.
commentSchema.index({ post: 1, createdAt: 1 });

export const Comment = mongoose.model('Comment', commentSchema);
