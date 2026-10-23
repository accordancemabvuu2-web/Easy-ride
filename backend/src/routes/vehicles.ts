import { Router } from "express";
import { Types } from "mongoose";
import type { SortOrder } from "mongoose";
import { z } from "zod";
import { BookingModel } from "../models/Booking.js";
import { DealerProfileModel } from "../models/DealerProfile.js";
import { RecentlyViewedVehicleModel } from "../models/RecentlyViewedVehicle.js";
import { SavedVehicleModel } from "../models/SavedVehicle.js";
import { VehicleModel } from "../models/Vehicle.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";

const router = Router();
const pagination = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(24) });
const published = { moderationStatus: "published", availabilityStatus: "available", deletedAt: null };

router.get("/featured", async (_req, res) => {
  const data = await VehicleModel.find({ ...published, publishedAt: { $exists: true } }).select("make model trim year condition listingType salePrice rentalPricing currency city country features publishedAt viewCount").sort({ publishedAt: -1, _id: -1 }).limit(12).lean();
  res.json({ success: true, data, meta: { strategy: "recently_published", limit: 12 } });
});

router.get("/trending", async (_req, res) => {
  const data = await VehicleModel.find(published).select("make model trim year condition listingType salePrice rentalPricing currency city country viewCount publishedAt").sort({ viewCount: -1, publishedAt: -1, _id: -1 }).limit(12).lean();
  res.json({ success: true, data, meta: { strategy: "view_count", limit: 12 } });
});

router.get("/compare", async (req, res) => {
  const ids = z.string().transform((value) => value.split(",")).pipe(z.array(z.string().refine(Types.ObjectId.isValid)).min(2).max(5)).parse(req.query.ids);
  const records = await VehicleModel.find({ _id: { $in: ids }, ...published }).select("make model trim year condition bodyType fuelType transmission drivetrain engineCapacity mileage mileageUnit exteriorColor listingType salePrice rentalPricing currency city country features").lean();
  const byId = new Map(records.map((vehicle) => [String(vehicle._id), vehicle]));
  const data = ids.map((id) => byId.get(id)).filter(Boolean);
  if (data.length !== ids.length) throw new HttpError(404, "NOT_FOUND", "One or more comparable vehicles are not available.");
  res.json({ success: true, data, meta: { count: data.length } });
});

router.get("/catalog/makes", async (_req, res) => {
  const data = await VehicleModel.aggregate([{ $match: published }, { $group: { _id: "$make" } }, { $sort: { _id: 1 } }, { $limit: 200 }]);
  res.json({ success: true, data: data.map((row) => row._id), meta: { limit: 200 } });
});

router.get("/catalog/models", async (req, res) => {
  const { make } = z.object({ make: z.string().trim().min(1).max(80) }).parse(req.query);
  const data = await VehicleModel.aggregate([{ $match: { ...published, make: new RegExp(`^${make.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } }, { $group: { _id: "$model" } }, { $sort: { _id: 1 } }, { $limit: 200 }]);
  res.json({ success: true, data: data.map((row) => row._id), meta: { make, limit: 200 } });
});

router.get("/catalog/locations", async (_req, res) => {
  const data = await VehicleModel.aggregate([{ $match: published }, { $group: { _id: { country: "$country", city: "$city" } } }, { $sort: { "_id.country": 1, "_id.city": 1 } }, { $limit: 500 }]);
  res.json({ success: true, data: data.map((row) => row._id), meta: { limit: 500 } });
});

router.get("/catalog/currencies", async (_req, res) => {
  const data = await VehicleModel.aggregate([{ $match: published }, { $group: { _id: "$currency" } }, { $sort: { _id: 1 } }, { $limit: 100 }]);
  res.json({ success: true, data: data.map((row) => row._id), meta: { limit: 100 } });
});

router.get("/estimate", async (req, res) => {
  const input = z.object({ make: z.string().trim().min(1).max(80), model: z.string().trim().min(1).max(80), year: z.coerce.number().int().min(1886).max(new Date().getFullYear() + 1), currency: z.string().length(3).default("ZAR"), country: z.string().max(2).optional() }).parse(req.query);
  const match: Record<string, unknown> = { moderationStatus: "published", listingType: { $in: ["sale", "sale_and_rent"] }, salePrice: { $gt: 0 }, make: new RegExp(`^${input.make.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), model: new RegExp(`^${input.model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), year: { $gte: input.year - 2, $lte: input.year + 2 }, currency: input.currency.toUpperCase() };
  if (input.country) match.country = input.country.toUpperCase();
  const [estimate] = await VehicleModel.aggregate([{ $match: match }, { $group: { _id: null, sampleSize: { $sum: 1 }, average: { $avg: "$salePrice" }, minimum: { $min: "$salePrice" }, maximum: { $max: "$salePrice" } } }]);
  const available = estimate?.sampleSize >= 3;
  res.json({ success: true, data: available ? { available: true, sampleSize: estimate.sampleSize, average: Math.round(estimate.average * 100) / 100, minimum: estimate.minimum, maximum: estimate.maximum, currency: input.currency.toUpperCase() } : { available: false, sampleSize: estimate?.sampleSize ?? 0, currency: input.currency.toUpperCase(), reason: "INSUFFICIENT_DATA" }, meta: { estimate: true } });
});

router.get("/", async (req, res) => {
  const p = pagination.extend({
    q: z.string().max(100).optional(), make: z.string().max(80).optional(), model: z.string().max(80).optional(), city: z.string().max(80).optional(), country: z.string().max(2).optional(),
    listingType: z.enum(["sale", "rent", "sale_and_rent"]).optional(), condition: z.enum(["new", "used", "certified_pre_owned"]).optional(), bodyType: z.string().max(60).optional(), fuelType: z.string().max(60).optional(), transmission: z.string().max(60).optional(),
    minPrice: z.coerce.number().min(0).optional(), maxPrice: z.coerce.number().min(0).optional(), yearMin: z.coerce.number().int().min(1886).max(2100).optional(), yearMax: z.coerce.number().int().min(1886).max(2100).optional(), mileageMax: z.coerce.number().min(0).optional(),
    sort: z.enum(["newest", "price_asc", "price_desc", "year_desc", "mileage_asc"]).default("newest"),
  }).superRefine((value, ctx) => {
    if (value.minPrice !== undefined && value.maxPrice !== undefined && value.minPrice > value.maxPrice) ctx.addIssue({ code: "custom", path: ["minPrice"], message: "minPrice must not exceed maxPrice." });
    if (value.yearMin !== undefined && value.yearMax !== undefined && value.yearMin > value.yearMax) ctx.addIssue({ code: "custom", path: ["yearMin"], message: "yearMin must not exceed yearMax." });
  }).parse(req.query);
  const filter: Record<string, unknown> = { ...published };
  if (p.q) filter.$text = { $search: p.q };
  for (const field of ["make", "model", "city", "bodyType", "fuelType", "transmission"] as const) if (p[field]) filter[field] = new RegExp(`^${p[field]!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  if (p.country) filter.country = p.country.toUpperCase();
  if (p.listingType) filter.listingType = p.listingType;
  if (p.condition) filter.condition = p.condition;
  if (p.minPrice !== undefined || p.maxPrice !== undefined) filter.salePrice = { ...(p.minPrice !== undefined ? { $gte: p.minPrice } : {}), ...(p.maxPrice !== undefined ? { $lte: p.maxPrice } : {}) };
  if (p.yearMin !== undefined || p.yearMax !== undefined) filter.year = { ...(p.yearMin !== undefined ? { $gte: p.yearMin } : {}), ...(p.yearMax !== undefined ? { $lte: p.yearMax } : {}) };
  if (p.mileageMax !== undefined) filter.mileage = { $lte: p.mileageMax };
  const sort: Record<string, SortOrder> = p.sort === "price_asc" ? { salePrice: 1, _id: 1 } : p.sort === "price_desc" ? { salePrice: -1, _id: 1 } : p.sort === "year_desc" ? { year: -1, _id: 1 } : p.sort === "mileage_asc" ? { mileage: 1, _id: 1 } : { publishedAt: -1, _id: -1 };
  const [data, total] = await Promise.all([VehicleModel.find(filter).select("-vin -address").sort(sort).skip((p.page - 1) * p.pageSize).limit(p.pageSize).lean(), VehicleModel.countDocuments(filter)]);
  res.json({ success: true, data, meta: { page: p.page, pageSize: p.pageSize, total } });
});

router.get("/me/recently-viewed", authenticate, async (req, res) => {
  const { page, pageSize } = pagination.parse(req.query);
  const filter = { userId: req.auth!.userId };
  const records = await RecentlyViewedVehicleModel.find(filter).sort({ viewedAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).populate({ path: "vehicleId", match: { deletedAt: null }, select: "make model year condition listingType salePrice rentalPricing currency city country moderationStatus" }).lean();
  const data = records.map((record) => ({ viewedAt: record.viewedAt, vehicle: record.vehicleId })).filter((record) => record.vehicle);
  const total = await RecentlyViewedVehicleModel.countDocuments(filter);
  res.json({ success: true, data, meta: { page, pageSize, total } });
});

router.get("/me/saved", authenticate, async (req, res) => {
  const p = pagination.parse(req.query); const filter = { userId: req.auth!.userId };
  const [data, total] = await Promise.all([SavedVehicleModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip((p.page - 1) * p.pageSize).limit(p.pageSize).populate({ path: "vehicleId", select: "make model year salePrice currency city listingType" }).lean(), SavedVehicleModel.countDocuments(filter)]);
  res.json({ success: true, data, meta: { page: p.page, pageSize: p.pageSize, total } });
});
router.put("/me/saved/:vehicleId", authenticate, async (req, res) => {
  const id = String(req.params.vehicleId); if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Vehicle ID is invalid.");
  const vehicle = await VehicleModel.findOne({ _id: id, moderationStatus: "published", availabilityStatus: "available" }).select("_id");
  if (!vehicle) throw new HttpError(404, "NOT_FOUND", "Vehicle not found.");
  await SavedVehicleModel.updateOne({ userId: req.auth!.userId, vehicleId: vehicle._id }, { $setOnInsert: { userId: req.auth!.userId, vehicleId: vehicle._id } }, { upsert: true });
  res.json({ success: true, data: { saved: true }, meta: {} });
});
router.delete("/me/saved/:vehicleId", authenticate, async (req, res) => {
  const id = String(req.params.vehicleId); if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Vehicle ID is invalid.");
  await SavedVehicleModel.deleteOne({ userId: req.auth!.userId, vehicleId: id }); res.json({ success: true, data: { saved: false }, meta: {} });
});

router.get("/:id/similar", async (req, res) => {
  const id = String(req.params.id); if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Vehicle ID is invalid.");
  const source = await VehicleModel.findOne({ _id: id, ...published }).select("make model bodyType salePrice country").lean();
  if (!source) throw new HttpError(404, "NOT_FOUND", "Vehicle not found.");
  const filter: Record<string, unknown> = { ...published, _id: { $ne: source._id }, $or: [{ make: source.make, model: source.model }, { bodyType: source.bodyType, country: source.country }] };
  if (source.salePrice && source.salePrice > 0) filter.salePrice = { $gte: source.salePrice * 0.6, $lte: source.salePrice * 1.4 };
  const data = await VehicleModel.find(filter).select("make model year condition listingType salePrice rentalPricing currency city country").sort({ publishedAt: -1, _id: -1 }).limit(12).lean();
  res.json({ success: true, data, meta: { limit: 12 } });
});

router.get("/:id/availability", async (req, res) => {
  const id = String(req.params.id); if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Vehicle ID is invalid.");
  const { startDate, endDate } = z.object({ startDate: z.coerce.date(), endDate: z.coerce.date() }).refine((value) => value.startDate <= value.endDate).parse(req.query);
  const vehicle = await VehicleModel.findOne({ _id: id, ...published }).select("listingType").lean();
  if (!vehicle) throw new HttpError(404, "NOT_FOUND", "Vehicle not found.");
  if (!["rent", "sale_and_rent"].includes(vehicle.listingType)) throw new HttpError(400, "NOT_RENTABLE", "This vehicle is not listed for rent.");
  const conflict = await BookingModel.exists({ vehicleId: id, status: { $in: ["pending", "confirmed"] }, startDate: { $lte: endDate }, endDate: { $gte: startDate } });
  res.json({ success: true, data: { vehicleId: id, available: !conflict, startDate, endDate }, meta: { note: "Availability is informational; booking creation performs its own reservation check." } });
});

router.get("/:id", optionalAuthenticate, async (req, res) => {
  const id = String(req.params.id); if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Vehicle ID is invalid.");
  const data = await VehicleModel.findOne({ _id: id, moderationStatus: "published", deletedAt: null }).select("-vin -address").lean();
  if (!data) throw new HttpError(404, "NOT_FOUND", "Vehicle not found.");
  await VehicleModel.updateOne({ _id: data._id }, { $inc: { viewCount: 1 } });
  if (req.auth) await RecentlyViewedVehicleModel.updateOne({ userId: req.auth.userId, vehicleId: data._id }, { $set: { viewedAt: new Date() } }, { upsert: true });
  res.json({ success: true, data, meta: {} });
});

router.post("/", authenticate, async (req, res) => {
  const p = z.object({ make: z.string().trim().min(1).max(80), model: z.string().trim().min(1).max(80), year: z.number().int().min(1886).max(new Date().getFullYear() + 1), condition: z.enum(["new", "used", "certified_pre_owned"]), description: z.string().trim().min(1).max(12000), listingType: z.enum(["sale", "rent", "sale_and_rent"]), salePrice: z.number().min(0).optional(), rentalPricing: z.object({ day: z.number().min(0).optional(), week: z.number().min(0).optional(), month: z.number().min(0).optional() }).optional(), currency: z.string().length(3), mileage: z.number().min(0).optional(), mileageUnit: z.enum(["km", "mi"]).optional(), country: z.string().max(2).optional(), city: z.string().max(80).optional(), features: z.array(z.string().max(80)).max(100).optional() }).strict().superRefine((v, c) => { if (["sale", "sale_and_rent"].includes(v.listingType) && v.salePrice === undefined) c.addIssue({ code: "custom", path: ["salePrice"], message: "Sale price is required." }); if (["rent", "sale_and_rent"].includes(v.listingType) && v.rentalPricing?.day === undefined) c.addIssue({ code: "custom", path: ["rentalPricing", "day"], message: "Daily rental price is required." }); }).parse(req.body);
  const dealer = await DealerProfileModel.findOne({ userId: req.auth!.userId, verificationStatus: "verified" }).select("_id").lean();
  const data = await VehicleModel.create({ ...p, sellerId: req.auth!.userId, dealerId: dealer?._id ?? null, moderationStatus: "pending_review" });
  res.status(201).json({ success: true, data: { id: String(data._id), moderationStatus: data.moderationStatus }, meta: {} });
});

router.patch("/:id", authenticate, async (req, res) => {
  const id = String(req.params.id); if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Vehicle ID is invalid.");
  const patch = z.object({ make: z.string().trim().min(1).max(80).optional(), model: z.string().trim().min(1).max(80).optional(), year: z.number().int().min(1886).max(new Date().getFullYear() + 1).optional(), condition: z.enum(["new", "used", "certified_pre_owned"]).optional(), description: z.string().trim().min(1).max(12000).optional(), salePrice: z.number().min(0).optional(), rentalPricing: z.object({ day: z.number().min(0).optional(), week: z.number().min(0).optional(), month: z.number().min(0).optional() }).optional(), currency: z.string().length(3).optional(), mileage: z.number().min(0).optional(), city: z.string().max(80).optional(), country: z.string().max(2).optional(), features: z.array(z.string().max(80)).max(100).optional() }).strict().parse(req.body);
  const vehicle = await VehicleModel.findOne({ _id: id, sellerId: req.auth!.userId, deletedAt: null }); if (!vehicle) throw new HttpError(404, "NOT_FOUND", "Vehicle not found.");
  vehicle.set(patch); if (vehicle.moderationStatus === "published") vehicle.moderationStatus = "pending_review"; await vehicle.save();
  res.json({ success: true, data: { id: String(vehicle._id), moderationStatus: vehicle.moderationStatus, updatedAt: vehicle.updatedAt }, meta: {} });
});
router.post("/:id/publish", authenticate, async (req, res) => {
  const id = String(req.params.id); if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Vehicle ID is invalid.");
  const vehicle = await VehicleModel.findOne({ _id: id, sellerId: req.auth!.userId, deletedAt: null }); if (!vehicle) throw new HttpError(404, "NOT_FOUND", "Vehicle not found.");
  if (vehicle.moderationStatus === "published") throw new HttpError(409, "INVALID_STATE", "Vehicle is already published.");
  vehicle.moderationStatus = "pending_review"; await vehicle.save(); res.json({ success: true, data: { id: String(vehicle._id), moderationStatus: vehicle.moderationStatus }, meta: {} });
});
router.delete("/:id", authenticate, async (req, res) => {
  const id = String(req.params.id); if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Vehicle ID is invalid.");
  const vehicle = await VehicleModel.findOneAndUpdate({ _id: id, sellerId: req.auth!.userId, deletedAt: null }, { $set: { deletedAt: new Date(), availabilityStatus: "archived" } }, { new: true });
  if (!vehicle) throw new HttpError(404, "NOT_FOUND", "Vehicle not found."); res.json({ success: true, data: { deleted: true }, meta: {} });
});

export default router;
