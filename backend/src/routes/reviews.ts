import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { BookingModel } from "../models/Booking.js";
import { DealerProfileModel } from "../models/DealerProfile.js";
import { ReviewModel } from "../models/Review.js";
import { authenticate } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";

const router = Router();
const page = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) });

router.post("/", authenticate, async (req, res) => {
  const input = z.object({ bookingId: z.string().refine(Types.ObjectId.isValid), rating: z.number().int().min(1).max(5), comment: z.string().trim().max(4000).optional() }).strict().parse(req.body);
  const booking = await BookingModel.findOne({ _id: input.bookingId, status: "completed", $or: [{ buyerId: req.auth!.userId }, { sellerId: req.auth!.userId }] }).select("buyerId sellerId vehicleId").lean();
  if (!booking) throw new HttpError(404, "INELIGIBLE_TRANSACTION", "A completed booking involving your account is required to review.");
  const reviewedUserId = String(booking.buyerId) === req.auth!.userId ? booking.sellerId : booking.buyerId;
  if (String(reviewedUserId) === req.auth!.userId) throw new HttpError(400, "SELF_REVIEW", "You cannot review yourself.");
  const dealer = await DealerProfileModel.findOne({ userId: reviewedUserId, verificationStatus: "verified" }).select("_id").lean();
  const review = await ReviewModel.create({ reviewerId: req.auth!.userId, reviewedUserId, dealerId: dealer?._id, vehicleId: booking.vehicleId, bookingId: booking._id, rating: input.rating, comment: input.comment, moderationStatus: "pending" });
  res.status(201).json({ success: true, data: { id: String(review._id), rating: review.rating, moderationStatus: review.moderationStatus }, meta: {} });
});

router.get("/users/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "User ID is invalid.");
  const { page: pageNumber, pageSize } = page.parse(req.query);
  const filter = { reviewedUserId: id, moderationStatus: "approved" };
  const [data, total] = await Promise.all([ReviewModel.find(filter).select("reviewerId vehicleId rating comment sellerResponse sellerRespondedAt createdAt").sort({ createdAt: -1, _id: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize).lean(), ReviewModel.countDocuments(filter)]);
  res.json({ success: true, data, meta: { page: pageNumber, pageSize, total } });
});

router.post("/:id/response", authenticate, async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Review ID is invalid.");
  const { response } = z.object({ response: z.string().trim().min(1).max(2000) }).strict().parse(req.body);
  const review = await ReviewModel.findOne({ _id: id, reviewedUserId: req.auth!.userId, moderationStatus: "approved" });
  if (!review) throw new HttpError(404, "NOT_FOUND", "Review not found for this seller.");
  review.sellerResponse = response;
  review.sellerRespondedAt = new Date();
  await review.save();
  res.json({ success: true, data: { id: String(review._id), sellerResponse: review.sellerResponse, sellerRespondedAt: review.sellerRespondedAt }, meta: {} });
});

export default router;
