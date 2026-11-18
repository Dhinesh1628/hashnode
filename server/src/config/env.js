import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Read and check environment variables once, at startup.
// Failing loudly here beats a confusing crash on the first login request.

const required = ['MONGO_URI', 'JWT_SECRET'];

// Where `npm run build` in client/ puts the website.
const DEFAULT_CLIENT_DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../client/dist');

export function loadEnv(source = process.env) {
  const missing = required.filter((key) => !source[key]);
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  if (source.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  const isProduction = source.NODE_ENV === 'production';
  return Object.freeze({
    port: Number(source.PORT) || 5050,
    mongoUri: source.MONGO_URI,
    jwtSecret: source.JWT_SECRET,
    jwtExpiresIn: source.JWT_EXPIRES_IN || '7d',
    clientOrigin: source.CLIENT_ORIGIN || 'http://localhost:5174',
    isProduction,
    // In production the API also serves the built website, so both share one URL.
    // CLIENT_DIST overrides the folder; in development Vite serves the site instead.
    clientDist: source.CLIENT_DIST || (isProduction ? DEFAULT_CLIENT_DIST : null),
    // Login/register attempts allowed per IP address per 15 minutes.
    authRateLimit: Number(source.AUTH_RATE_LIMIT) || 20,
  });
}
