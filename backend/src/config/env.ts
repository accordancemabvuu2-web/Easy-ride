import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

function findBackendRoot(start = dirname(fileURLToPath(import.meta.url))) {
  let current = resolve(start);
  for (let depth = 0; depth < 8; depth += 1) {
    const packageFile = resolve(current, "package.json");
    if (existsSync(packageFile)) {
      try {
        if (JSON.parse(readFileSync(packageFile, "utf8")).name === "easy-ride-backend") return current;
      } catch { /* Continue searching parent directories. */ }
    }
    const parent = resolve(current, "..");
    if (parent === current) break;
    current = parent;
  }
  throw new Error("Could not locate the easy-ride-backend package root for environment loading.");
}

const envFile = resolve(findBackendRoot(), ".env");
// Explicit shell/process variables keep precedence; the backend file is the only dotenv source.
loadDotenv({ path: envFile, override: false });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4567),
  MONGODB_URI: z.string().trim().min(1).refine((value) => value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"), "Must be a MongoDB connection URI."),
  MONGODB_DB_NAME: z.string().trim().min(1).default("easy_ride"),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  PUBLIC_API_BASE_URL: z.string().url().optional(),
  SWAGGER_ENABLED: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  JWT_ACCESS_SECRET: z.string().min(32, "Must contain at least 32 characters."),
  JWT_REFRESH_SECRET: z.string().min(32, "Must contain at least 32 characters."),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
}).superRefine((value, ctx) => {
  if (value.JWT_ACCESS_SECRET === value.JWT_REFRESH_SECRET) {
    ctx.addIssue({ code: "custom", path: ["JWT_REFRESH_SECRET"], message: "Must differ from JWT_ACCESS_SECRET." });
  }
  if (value.JWT_ACCESS_SECRET.startsWith("replace_")) {
    ctx.addIssue({ code: "custom", path: ["JWT_ACCESS_SECRET"], message: "Replace the example value with a random secret." });
  }
  if (value.JWT_REFRESH_SECRET.startsWith("replace_")) {
    ctx.addIssue({ code: "custom", path: ["JWT_REFRESH_SECRET"], message: "Replace the example value with a random secret." });
  }
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`).join("; ");
  const fileHint = existsSync(envFile) ? envFile : `${envFile} (file is missing; externally supplied variables may also be used)`;
  throw new Error(`Invalid backend environment configuration from ${fileHint}: ${details}`);
}
export const env = parsed.data;
