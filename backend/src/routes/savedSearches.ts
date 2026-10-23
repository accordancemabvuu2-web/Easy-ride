import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { SavedSearchModel } from "../models/SavedSearch.js";
import { authenticate } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";

const router = Router();
const criteriaSchema = z.object({
  q: z.string().max(100).optional(), make: z.string().max(80).optional(), model: z.string().max(80).optional(),
  city: z.string().max(80).optional(), country: z.string().max(2).optional(),
  listingType: z.enum(["sale", "rent", "sale_and_rent"]).optional(),
  condition: z.enum(["new", "used", "certified_pre_owned"]).optional(),
  bodyType: z.string().max(60).optional(), fuelType: z.string().max(60).optional(), transmission: z.string().max(60).optional(),
  minPrice: z.number().min(0).optional(), maxPrice: z.number().min(0).optional(),
  yearMin: z.number().int().min(1886).max(2100).optional(), yearMax: z.number().int().min(1886).max(2100).optional(),
}).strict().refine((value) => value.minPrice === undefined || value.maxPrice === undefined || value.minPrice <= value.maxPrice, "minPrice must not exceed maxPrice.");
const pageSchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(24) });

router.use(authenticate);
router.get("/", async (req, res) => {
  const { page, pageSize } = pageSchema.parse(req.query);
  const filter = { userId: req.auth!.userId };
  const [data, total] = await Promise.all([
    SavedSearchModel.find(filter).sort({ updatedAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    SavedSearchModel.countDocuments(filter),
  ]);
  res.json({ success: true, data, meta: { page, pageSize, total } });
});
router.post("/", async (req, res) => {
  const input = z.object({ name: z.string().trim().min(1).max(100), criteria: criteriaSchema, notificationPreferences: z.object({ email: z.boolean().default(false), push: z.boolean().default(false) }).strict().default({ email: false, push: false }) }).strict().parse(req.body);
  const saved = await SavedSearchModel.create({ ...input, userId: req.auth!.userId });
  res.status(201).json({ success: true, data: saved, meta: {} });
});
router.patch("/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Saved search ID is invalid.");
  const patch = z.object({ name: z.string().trim().min(1).max(100).optional(), criteria: criteriaSchema.optional(), notificationPreferences: z.object({ email: z.boolean().optional(), push: z.boolean().optional() }).strict().optional() }).strict().parse(req.body);
  const saved = await SavedSearchModel.findOneAndUpdate({ _id: id, userId: req.auth!.userId }, { $set: patch }, { new: true, runValidators: true }).lean();
  if (!saved) throw new HttpError(404, "NOT_FOUND", "Saved search not found.");
  res.json({ success: true, data: saved, meta: {} });
});
router.delete("/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Saved search ID is invalid.");
  const result = await SavedSearchModel.deleteOne({ _id: id, userId: req.auth!.userId });
  if (!result.deletedCount) throw new HttpError(404, "NOT_FOUND", "Saved search not found.");
  res.json({ success: true, data: { deleted: true }, meta: {} });
});

export default router;
