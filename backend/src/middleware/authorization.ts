import type { RequestHandler } from "express";
import { authenticate } from "./auth.js";
import { HttpError } from "./errors.js";

/** Checks the database-backed role populated by authenticate for this request. */
export function requireCurrentRole(...roles: Array<"user" | "dealer" | "admin">): RequestHandler {
  return async (req, _res, next) => {
    try {
      if (!req.auth) throw new HttpError(401, "UNAUTHENTICATED", "Sign in to continue.");
      if (!roles.includes(req.auth.role as "user" | "dealer" | "admin")) throw new HttpError(403, "FORBIDDEN", "You are not allowed to perform this action.");
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireAdmin: RequestHandler[] = [authenticate, requireCurrentRole("admin")];
