import jwt from 'jsonwebtoken';

// The website keeps the login token in an httpOnly cookie: the browser sends
// it automatically, and no JavaScript on the page (including injected
// scripts) can read it. API clients like Postman can still use the
// "Authorization: Bearer" header instead.

export const AUTH_COOKIE = 'hn_token';

function baseOptions(env) {
  return {
    httpOnly: true,           // invisible to document.cookie
    secure: env.isProduction, // HTTPS only in production (localhost is plain HTTP)
    sameSite: 'lax',          // not sent on cross-site POST/fetch, which blocks most CSRF
    path: '/api',             // only API requests carry it
  };
}

export function setAuthCookie(res, token, env) {
  const { exp } = jwt.decode(token); // the cookie expires exactly when the token does
  res.cookie(AUTH_COOKIE, token, { ...baseOptions(env), expires: new Date(exp * 1000) });
}

export function clearAuthCookie(res, env) {
  res.clearCookie(AUTH_COOKIE, baseOptions(env));
}

// Express doesn't parse cookies by itself, and we only ever need this one.
export function readAuthCookie(req) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq !== -1 && part.slice(0, eq).trim() === AUTH_COOKIE) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}
