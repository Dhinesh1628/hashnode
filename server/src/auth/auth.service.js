import bcrypt from 'bcryptjs';
import { User } from '../users/user.model.js';
import { HttpError } from '../lib/http-error.js';
import { check, EMAIL } from '../lib/check.js';

// Used when the email doesn't exist, so a failed login takes the same time
// either way. Otherwise response timing reveals which emails are registered.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser', 12);

export async function registerUser(body) {
  const v = check(body)
    .field('name', { label: 'Name', required: true, type: 'string', max: 60 })
    .field('email', { label: 'Email', required: true, type: 'string', pattern: EMAIL, patternMessage: 'Enter a valid email address' })
    .field('password', { label: 'Password', required: true, type: 'string', min: 8, max: 72 });
  // bcrypt ignores everything after 72 bytes, hence the max.
  if (!v.ok()) throw HttpError.badRequest('Please fix the highlighted fields', v.errors());

  const email = body.email.trim().toLowerCase();
  if (await User.exists({ email })) {
    throw HttpError.conflict('An account with this email already exists', { email: 'Already registered' });
  }

  return User.create({ name: body.name.trim(), email, password: body.password });
}

export async function loginUser(body) {
  const v = check(body)
    .field('email', { label: 'Email', required: true, type: 'string' })
    .field('password', { label: 'Password', required: true, type: 'string' });
  if (!v.ok()) throw HttpError.badRequest('Please fix the highlighted fields', v.errors());

  const user = await User.findOne({ email: body.email.trim().toLowerCase() }).select('+password');
  const valid = await bcrypt.compare(body.password, user ? user.password : DUMMY_HASH);

  // Same message for "no such email" and "wrong password".
  if (!user || !valid) throw HttpError.unauthorized('Email or password is incorrect');
  return user;
}
