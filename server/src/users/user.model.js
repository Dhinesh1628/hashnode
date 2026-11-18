import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

// What other people may see about a user. Email is deliberately missing.
export const PUBLIC_USER_FIELDS = 'name avatarUrl bio';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select: false -> the hash is never loaded unless a query asks for it with
    // .select('+password'). Only the login flow does that.
    password: { type: String, required: true, select: false },
    bio: { type: String, maxlength: 200, default: '' },
    avatarUrl: { type: String, default: '' },
  },
  { timestamps: true },
);

// Hash only when the password actually changed, so updating a bio
// doesn't re-hash an already-hashed password.
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

userSchema.methods.passwordMatches = function passwordMatches(plain) {
  return bcrypt.compare(plain, this.password);
};

// Second safety net: even if the hash was selected, it never leaves the API.
userSchema.set('toJSON', {
  versionKey: false,
  transform(_doc, ret) {
    delete ret.password;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
