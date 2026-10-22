import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI is not configured.");

type MongoCache = { connection: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const globalForMongoose = globalThis as typeof globalThis & { mongooseCache?: MongoCache };
const cache = (globalForMongoose.mongooseCache ??= { connection: null, promise: null });

export async function connectMongo() {
  if (cache.connection?.connection.readyState === 1) return cache.connection;
  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI!, { bufferCommands: false, serverSelectionTimeoutMS: 8000 })
      .then((connection) => {
        cache.connection = connection;
        return connection;
      })
      .catch((error: unknown) => {
        cache.promise = null;
        cache.connection = null;
        throw error;
      });
  }
  return cache.promise;
}
