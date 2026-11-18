import mongoose from 'mongoose';

export async function connectDb(uri) {
  // Reject unknown fields in queries instead of silently ignoring them.
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

export function disconnectDb() {
  return mongoose.disconnect();
}
