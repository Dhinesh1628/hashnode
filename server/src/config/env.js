// Read and check environment variables once, at startup.
// Failing loudly here beats a confusing crash on the first login request.

const required = ['MONGO_URI', 'JWT_SECRET'];

export function loadEnv(source = process.env) {
  const missing = required.filter((key) => !source[key]);
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  if (source.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  return Object.freeze({
    port: Number(source.PORT) || 5050,
    mongoUri: source.MONGO_URI,
    jwtSecret: source.JWT_SECRET,
    jwtExpiresIn: source.JWT_EXPIRES_IN || '7d',
    clientOrigin: source.CLIENT_ORIGIN || 'http://localhost:5173',
    isProduction: source.NODE_ENV === 'production',
  });
}
