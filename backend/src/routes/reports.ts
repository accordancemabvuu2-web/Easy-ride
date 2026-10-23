import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { ReportModel } from "../models/Report.js";
import { VehicleModel } from "../models/Vehicle.js";
import { ReviewModel } from "../models/Review.js";
import { UserModel } from "../models/User.js";
import { BookingModel } from "../models/Booking.js";
import { authenticate } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";

const router = Router();
router.post("/", authenticate, async (req, res) => {
  const input = z.object({ vehicleId: z.string().refine(Types.ObjectId.isValid).optional(), reportedUserId: z.string().refine(Types.ObjectId.isValid).optional(), reviewId: z.string().refine(Types.ObjectId.isValid).optional(), bookingId: z.string().refine(Types.ObjectId.isValid).optional(), reason: z.string().trim().min(3).max(120), description: z.string().trim().max(4000).optional() }).strict().refine((v) => [v.vehicleId, v.reportedUserId, v.reviewId, v.bookingId].filter(Boolean).length === 1, "Report exactly one resource.").parse(req.body);
  if (input.vehicleId && !await VehicleModel.exists({ _id: input.vehicleId })) throw new HttpError(404, "NOT_FOUND", "Vehicle not found.");
  if (input.reportedUserId && (!await UserModel.exists({ _id: input.reportedUserId, accountStatus: { $ne: "deleted" } }) || input.reportedUserId === req.auth!.userId)) throw new HttpError(404, "NOT_FOUND", "Report target not found.");
  if (input.reviewId && !await ReviewModel.exists({ _id: input.reviewId })) throw new HttpError(404, "NOT_FOUND", "Review not found.");
  if (input.bookingId && !await BookingModel.exists({ _id: input.bookingId, $or: [{ buyerId: req.auth!.userId }, { sellerId: req.auth!.userId }] })) throw new HttpError(404, "NOT_FOUND", "Booking not found.");
  const report = await ReportModel.create({ ...input, reporterId: req.auth!.userId });
  res.status(201).json({ success: true, data: { id: String(report._id), status: report.status }, meta: {} });
});

export default router;
