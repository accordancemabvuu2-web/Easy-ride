import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

let connectionPromise: Promise<typeof mongoose> | undefined;
let lifecycleHandlersAttached = false;

function attachLifecycleHandlers() {
  if (lifecycleHandlersAttached) return;
  lifecycleHandlersAttached = true;
  mongoose.connection.on("connected", () => logger.info({ database: env.MONGODB_DB_NAME }, "MongoDB connection established"));
  mongoose.connection.on("disconnected", () => logger.warn({ database: env.MONGODB_DB_NAME }, "MongoDB connection lost"));
  mongoose.connection.on("error", (error: Error & { code?: string | number }) => {
    logger.error({ errorName: error.name, errorCode: error.code }, "MongoDB connection error");
  });
}

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (connectionPromise) return connectionPromise;

  attachLifecycleHandlers();
  connectionPromise = mongoose.connect(env.MONGODB_URI, {
    dbName: env.MONGODB_DB_NAME,
    maxPoolSize: env.NODE_ENV === "production" ? 30 : 10,
    minPoolSize: env.NODE_ENV === "production" ? 2 : 0,
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    autoIndex: env.NODE_ENV !== "production",
  }).catch((error: unknown) => {
    connectionPromise = undefined;
    throw error;
  });

  return connectionPromise;
}

export async function disconnectDatabase() {
  connectionPromise = undefined;
  await mongoose.disconnect();
}

export async function databaseReady() {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) return false;
  try {
    await mongoose.connection.db.admin().command({ ping: 1, maxTimeMS: 2000 });
    return true;
  } catch {
    return false;
  }
}
