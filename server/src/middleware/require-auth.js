import jwt from 'jsonwebtoken';
import { verifyToken } from '../auth/token.js';
import { User } from '../users/user.model.js';
import { HttpError } from '../lib/http-error.js';

// Expects "Authorization: Bearer <token>". On success, req.user is the
// current user document (without the password hash).
export function requireAuth(env) {
  return async function requireAuthMiddleware(req, _res, next) {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) throw HttpError.unauthorized();

    let payload;
    try {
      payload = verifyToken(token, env);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw HttpError.unauthorized('Your session has expired, please log in again');
      }
      throw HttpError.unauthorized('Invalid session, please log in again');
    }

    // A valid token for a deleted account is still rejected.
    const user = await User.findById(payload.sub);
    if (!user) throw HttpError.unauthorized('Account no longer exists');

    req.user = user;
    next();
  };
}
