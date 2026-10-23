import pino from "pino";
import { env } from "../config/env.js";
export const logger = pino({ level: env.LOG_LEVEL, redact: { paths: ["req.headers.authorization", "req.headers.cookie", "password", "passwordHash", "token", "refreshToken", "MONGODB_URI"], censor: "[REDACTED]" }, base: { service: "easy-ride-api" } });
