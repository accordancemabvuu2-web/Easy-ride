import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { DealerProfileModel } from "../models/DealerProfile.js";
import { VehicleModel } from "../models/Vehicle.js";
import { ReviewModel } from "../models/Review.js";
import { authenticate } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";

const router = Router();
const page = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(24) });
const profileInput = z.object({ businessName: z.string().trim().min(2).max(160), businessRegistrationNumber: z.string().trim().max(100).optional(), description: z.string().trim().max(6000).optional(), contactEmail: z.string().email().max(254).optional(), contactPhone: z.string().trim().max(32).optional(), address: z.string().trim().max(500).optional() }).strict();

router.post("/", authenticate, async (req, res) => {
  const input = profileInput.parse(req.body);
  const existing = await DealerProfileModel.exists({ userId: req.auth!.userId });
  if (existing) throw new HttpError(409, "APPLICATION_EXISTS", "A dealer profile already exists for this account.");
  const dealer = await DealerProfileModel.create({ ...input, userId: req.auth!.userId, verificationStatus: "pending" });
  res.status(201).json({ success: true, data: { id: String(dealer._id), businessName: dealer.businessName, verificationStatus: dealer.verificationStatus }, meta: {} });
});

router.patch("/me", authenticate, async (req, res) => {
  const input = profileInput.partial().parse(req.body);
  const dealer = await DealerProfileModel.findOneAndUpdate({ userId: req.auth!.userId }, { $set: input }, { new: true, runValidators: true }).select("businessName description contactEmail contactPhone address verificationStatus ratingAverage ratingCount updatedAt").lean();
  if (!dealer) throw new HttpError(404, "NOT_FOUND", "Dealer profile not found.");
  res.json({ success: true, data: dealer, meta: {} });
});

router.get("/me/vehicles", authenticate, async (req, res) => {
  const { page: pageNumber, pageSize } = page.parse(req.query);
  const dealer = await DealerProfileModel.findOne({ userId: req.auth!.userId }).select("_id").lean();
  if (!dealer) throw new HttpError(404, "NOT_FOUND", "Dealer profile not found.");
  const filter = { dealerId: dealer._id, deletedAt: null };
  const [data, total] = await Promise.all([
    VehicleModel.find(filter).select("make model year condition listingType salePrice rentalPricing currency availabilityStatus moderationStatus createdAt updatedAt").sort({ createdAt: -1, _id: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize).lean(),
    VehicleModel.countDocuments(filter),
  ]);
  res.json({ success: true, data, meta: { page: pageNumber, pageSize, total } });
});

router.get("/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Dealer ID is invalid.");
  const dealer = await DealerProfileModel.findById(id).select("businessName description contactEmail contactPhone location verificationStatus ratingAverage ratingCount createdAt").lean();
  if (!dealer || dealer.verificationStatus !== "verified") throw new HttpError(404, "NOT_FOUND", "Verified dealer not found.");
  res.json({ success: true, data: dealer, meta: {} });
});

router.get("/:id/reviews", async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Dealer ID is invalid.");
  const dealer = await DealerProfileModel.findOne({ _id: id, verificationStatus: "verified" }).select("_id").lean();
  if (!dealer) throw new HttpError(404, "NOT_FOUND", "Verified dealer not found.");
  const { page: pageNumber, pageSize } = page.parse(req.query);
  const filter = { dealerId: id, moderationStatus: "approved" };
  const [data, total] = await Promise.all([ReviewModel.find(filter).select("reviewerId vehicleId rating comment sellerResponse sellerRespondedAt createdAt").sort({ createdAt: -1, _id: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize).lean(), ReviewModel.countDocuments(filter)]);
  res.json({ success: true, data, meta: { page: pageNumber, pageSize, total } });
});

export default router;
