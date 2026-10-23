import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { VerificationRequestModel } from "../models/VerificationRequest.js";
import { VehicleModel } from "../models/Vehicle.js";
import { authenticate } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";

const router = Router();
router.use(authenticate);
router.get("/me", async (req, res) => {
  const { page, pageSize } = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) }).parse(req.query);
  const filter = { userId: req.auth!.userId };
  const [data, total] = await Promise.all([VerificationRequestModel.find(filter).select("vehicleId type status note reviewReason reviewedAt createdAt").sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(), VerificationRequestModel.countDocuments(filter)]);
  res.json({ success: true, data, meta: { page, pageSize, total } });
});
router.post("/", async (req, res) => {
  const input = z.object({ type: z.enum(["identity", "vehicle_ownership", "vehicle_history"]), vehicleId: z.string().refine(Types.ObjectId.isValid).optional(), note: z.string().trim().max(2000).optional() }).strict().refine((value) => value.type === "identity" ? value.vehicleId === undefined : value.vehicleId !== undefined, "Vehicle verification requests require vehicleId; identity requests must omit it.").parse(req.body);
  if (input.vehicleId && !await VehicleModel.exists({ _id: input.vehicleId, sellerId: req.auth!.userId, deletedAt: null })) throw new HttpError(404, "NOT_FOUND", "Owned vehicle not found.");
  const pending = await VerificationRequestModel.exists({ userId: req.auth!.userId, vehicleId: input.vehicleId ?? null, type: input.type, status: "pending" });
  if (pending) throw new HttpError(409, "REQUEST_EXISTS", "A matching verification request is already pending.");
  const request = await VerificationRequestModel.create({ ...input, userId: req.auth!.userId, status: input.type === "vehicle_history" ? "unavailable" : "pending" });
  res.status(201).json({ success: true, data: { id: String(request._id), type: request.type, status: request.status, message: request.status === "unavailable" ? "No vehicle history provider is configured." : undefined }, meta: {} });
});
export default router;
