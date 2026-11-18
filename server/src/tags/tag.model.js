import mongoose from 'mongoose';
import { slugify } from '../lib/slugify.js';

const tagSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 30 },
    slug: { type: String, required: true, unique: true },
  },
  { timestamps: true, toJSON: { versionKey: false } },
);

// Normalise names so "React", " react " and "REACT" are the same tag.
export function normaliseTagName(name) {
  return String(name).trim().toLowerCase().replace(/\s+/g, '-').slice(0, 30);
}

// Turns ["React", "node.js", "react"] into Tag ids, creating missing tags.
// Upserts make this safe even if two people create the same new tag at once.
tagSchema.statics.resolveNames = async function resolveNames(names = []) {
  const unique = [...new Set(names.map(normaliseTagName).filter(Boolean))].slice(0, 5);
  const tags = await Promise.all(
    unique.map((name) =>
      this.findOneAndUpdate(
        { name },
        { $setOnInsert: { name, slug: slugify(name) || name } },
        { upsert: true, new: true },
      ),
    ),
  );
  return tags.map((tag) => tag._id);
};

export const Tag = mongoose.model('Tag', tagSchema);
