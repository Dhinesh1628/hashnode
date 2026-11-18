import dns from 'node:dns';
import mongoose from 'mongoose';

// Atlas "mongodb+srv://" URIs need a DNS SRV lookup. On some Windows networks
// Node's resolver refuses it (querySrv ECONNREFUSED) even though nslookup works,
// so DNS_SERVERS lets you point Node at a public resolver, e.g. "8.8.8.8,1.1.1.1".
if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
}

export async function connectDb(uri) {
  // Reject unknown fields in queries instead of silently ignoring them.
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

export function disconnectDb() {
  return mongoose.disconnect();
}
