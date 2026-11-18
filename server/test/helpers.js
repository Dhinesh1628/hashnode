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
      // Dropping the database also drops indexes. Rebuild them so tests
      // run against the same unique rules as the real database.
      await Promise.all(mongoose.modelNames().map((name) => mongoose.model(name).createIndexes()));
    },
    async stop() {
      await mongoose.disconnect();
      await mongo.stop();
    },
  };
}
