import { registerUser, loginUser } from './auth.service.js';
import { signToken } from './token.js';

// Controllers stay thin: read the request, call the service, shape the response.
export function makeAuthController(env) {
  return {
    async register(req, res) {
      const user = await registerUser(req.body);
      res.status(201).json({ token: signToken(user._id, env), user });
    },

    async login(req, res) {
      const user = await loginUser(req.body);
      res.json({ token: signToken(user._id, env), user });
    },

    me(req, res) {
      res.json({ user: req.user });
    },
  };
}
