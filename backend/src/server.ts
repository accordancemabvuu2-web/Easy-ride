import { createServer, type Server } from "node:http";
import { app } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

function safeFailure(error: unknown) {
  const failure = error as {
    name?: string;
    code?: string | number;
    reason?: { servers?: Record<string, { error?: { name?: string; code?: string | number; syscall?: string } }> };
  };
  const nested = Object.values(failure.reason?.servers ?? {}).map((server) => server.error).filter(Boolean);
  const codes = [failure.code, ...nested.map((cause) => cause?.code)].filter((code) => code !== undefined);
  const syscalls = nested.map((cause) => cause?.syscall);
  let category = "startup_failed";
  if (codes.includes("EADDRINUSE")) category = "port_in_use";
  else if (codes.includes(18) || codes.includes("18")) category = "mongodb_authentication_failed";
  else if (codes.includes("ENOTFOUND") || codes.includes("EAI_AGAIN") || syscalls.includes("querySrv")) category = "mongodb_dns_lookup_failed";
  else if (codes.includes("ETIMEDOUT") || codes.includes("ECONNREFUSED") || codes.includes("EHOSTUNREACH")) category = "mongodb_network_unreachable";
  else if (failure.name === "MongooseServerSelectionError") category = "mongodb_server_selection_failed_check_cluster_network_access_and_credentials";
  return { errorName: failure.name ?? "unknown", errorCode: codes[0], category };
}

async function listen(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(env.PORT, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

async function main() {
  let server: Server | undefined;
  try {
    await connectDatabase();
    server = createServer(app);
    await listen(server);
  } catch (error) {
    const failure = safeFailure(error);
    if (failure.category === "port_in_use") {
      logger.error({ ...failure, port: env.PORT }, `Port ${env.PORT} is already in use; stop its owning process or choose another PORT.`);
    } else {
      logger.error(failure, "Backend startup failed; MongoDB must be reachable before the API starts");
    }
    await disconnectDatabase().catch(() => undefined);
    process.exitCode = 1;
    return;
  }

  logger.info({ port: env.PORT }, "Easy Ride API listening");
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown || !server) return;
    shuttingDown = true;
    logger.info({ signal }, "Graceful shutdown started");
    const timeout = setTimeout(() => {
      logger.error("Graceful shutdown timed out");
      server?.closeAllConnections();
      void disconnectDatabase().finally(() => process.exit(1));
    }, 10000);
    timeout.unref();

    server.close((error) => {
      void (async () => {
        clearTimeout(timeout);
        if (error) logger.error({ errorName: error.name }, "HTTP server shutdown reported an error");
        await disconnectDatabase();
        logger.info("MongoDB disconnected; shutdown complete");
        process.exitCode = error ? 1 : 0;
      })().catch((shutdownError: unknown) => {
        logger.error({ errorName: shutdownError instanceof Error ? shutdownError.name : "unknown" }, "Shutdown failed");
        process.exitCode = 1;
      });
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

void main();
