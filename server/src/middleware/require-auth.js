import jwt from 'jsonwebtoken';
import { verifyToken } from '../auth/token.js';
import { User } from '../users/user.model.js';
import { HttpError } from '../lib/http-error.js';

// Reads "Authorization: Bearer <token>" and returns the matching user
// (without the password hash), or throws a 401 HttpError.
async function userFromHeader(header, env) {
  const [scheme, token] = (header || '').split(' ');
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
  return user;
}

// For routes that need a logged-in user. On success, req.user is set.
export function requireAuth(env) {
  return async function requireAuthMiddleware(req, _res, next) {
    req.user = await userFromHeader(req.headers.authorization, env);
    next();
  };
}

// For public routes that show more to a logged-in user (an author previewing
// their own draft). A missing or bad token just means "anonymous visitor".
export function optionalAuth(env) {
  return async function optionalAuthMiddleware(req, _res, next) {
    if (req.headers.authorization) {
      try {
        req.user = await userFromHeader(req.headers.authorization, env);
      } catch (err) {
        if (!(err instanceof HttpError)) throw err; // real failures (DB down) still surface
      }
    }
    next();
  };
}
