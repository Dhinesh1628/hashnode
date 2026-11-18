import jwt from 'jsonwebtoken';
import { verifyToken } from '../auth/token.js';
import { readAuthCookie } from '../auth/session-cookie.js';
import { User } from '../users/user.model.js';
import { HttpError } from '../lib/http-error.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// The token comes from "Authorization: Bearer <token>" (API clients) or from
// the httpOnly session cookie (the website). The header wins if both exist.
//
// CSRF: a browser attaches cookies even to requests another site triggers.
// SameSite=Lax already blocks cross-site POSTs, and as a second lock every
// cookie-authenticated change must carry "X-Requested-With". Other sites can't
// add that header without a CORS preflight, which this API refuses.
function readToken(req) {
  const [scheme, headerToken] = (req.headers.authorization || '').split(' ');
  if (scheme === 'Bearer' && headerToken) return headerToken;

  const cookieToken = readAuthCookie(req);
  if (cookieToken && !SAFE_METHODS.has(req.method) && !req.get('X-Requested-With')) {
    throw HttpError.forbidden('Missing X-Requested-With header');
  }
  return cookieToken;
}

// Returns the logged-in user (without the password hash), or throws a 401.
async function userFromRequest(req, env) {
  const token = readToken(req);
  if (!token) throw HttpError.unauthorized();

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
    req.user = await userFromRequest(req, env);
    next();
  };
}

// For public routes that show more to a logged-in user (an author previewing
// their own draft). A missing or bad token just means "anonymous visitor".
export function optionalAuth(env) {
  return async function optionalAuthMiddleware(req, _res, next) {
    try {
      req.user = await userFromRequest(req, env);
    } catch (err) {
      if (!(err instanceof HttpError)) throw err; // real failures (DB down) still surface
    }
    next();
  };
}
