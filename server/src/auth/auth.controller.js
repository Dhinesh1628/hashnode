import { registerUser, loginUser } from './auth.service.js';
import { signToken } from './token.js';
import { setAuthCookie, clearAuthCookie } from './session-cookie.js';

// Controllers stay thin: read the request, call the service, shape the response.
// Login and register set the session cookie (for the website) and also return
// the token in the body (for API clients like Postman).
export function makeAuthController(env) {
  function startSession(res, user, status) {
    const token = signToken(user._id, env);
    setAuthCookie(res, token, env);
    res.status(status).json({ token, user });
  }

  return {
    async register(req, res) {
      startSession(res, await registerUser(req.body), 201);
    },

    async login(req, res) {
      startSession(res, await loginUser(req.body), 200);
    },

    me(req, res) {
      res.json({ user: req.user });
    },

    // Like /me, but "not logged in" is a normal answer ({ user: null }), not a 401.
    // The website calls this on every page load, so visitors don't get an error.
    session(req, res) {
      res.json({ user: req.user ?? null });
    },

    // Works even when not logged in, so the client can always call it.
    logout(_req, res) {
      clearAuthCookie(res, env);
      res.status(204).end();
    },
  };
}
