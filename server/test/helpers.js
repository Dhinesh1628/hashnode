import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';

// Spins up a throwaway in-memory MongoDB so tests never touch real data.
export async function startTestApp() {
  const mongo = await MongoMemoryServer.create();
  const env = loadEnv({
    MONGO_URI: mongo.getUri(),
    JWT_SECRET: 'test-secret-that-is-definitely-long-enough-123',
    JWT_EXPIRES_IN: '1h',
  });
  await mongoose.connect(env.mongoUri);

  return {
    app: createApp(env),
    env,
    async reset() {
      await mongoose.connection.db.dropDatabase();
    },
    async stop() {
      await mongoose.disconnect();
      await mongo.stop();
    },
  };
}
