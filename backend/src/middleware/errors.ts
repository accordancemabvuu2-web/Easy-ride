import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
export class HttpError extends Error { constructor(public status: number, public code: string, message: string) { super(message); } }
export const notFound: RequestHandler = (_req, _res, next) => next(new HttpError(404, "NOT_FOUND", "Resource not found."));
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error?.type === "entity.too.large") return res.status(413).json({ success: false, error: { code: "PAYLOAD_TOO_LARGE", message: "The request body is too large." } });
  if (error instanceof SyntaxError && "body" in error) return res.status(400).json({ success: false, error: { code: "INVALID_JSON", message: "The request body must be valid JSON." } });
 if (error instanceof ZodError) return res.status(400).json({ success:false,error:{code:"VALIDATION_ERROR",message:"The request could not be validated.",details:error.flatten()} });
 if (error instanceof HttpError) return res.status(error.status).json({ success:false,error:{code:error.code,message:error.message} });
 if (error?.code === 11000) return res.status(409).json({ success:false,error:{code:"CONFLICT",message:"A record with these details already exists."} });
 return res.status(500).json({ success:false,error:{code:"INTERNAL_ERROR",message:"An unexpected error occurred."} });
};
