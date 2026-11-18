import { loadEnv } from './config/env.js';
import { connectDb, disconnectDb } from './config/db.js';
import { createApp } from './app.js';

const env = loadEnv();
await connectDb(env.mongoUri);

const server = createApp(env).listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
});

// Close cleanly on Ctrl+C or when the host stops the process.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  });
}
