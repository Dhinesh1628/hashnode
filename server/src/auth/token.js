import jwt from 'jsonwebtoken';

// The token only carries the user id ("sub" = subject). Name, email etc.
// are always read fresh from the database, so they can't go stale.
export function signToken(userId, { jwtSecret, jwtExpiresIn }) {
  return jwt.sign({ sub: String(userId) }, jwtSecret, { expiresIn: jwtExpiresIn });
}

export function verifyToken(token, { jwtSecret }) {
  return jwt.verify(token, jwtSecret); // throws if invalid or expired
}
