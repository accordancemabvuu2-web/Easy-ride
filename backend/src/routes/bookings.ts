import { Router } from "express";
import mongoose, { Types } from "mongoose";
import { z } from "zod";
import { BookingModel } from "../models/Booking.js";
import { ReportModel } from "../models/Report.js";
import { VehicleModel } from "../models/Vehicle.js";
import { authenticate } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";

const router = Router();
const pagination = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(24) });
router.use(authenticate);

router.get("/me", async (req, res) => {
  const p = pagination.extend({ role: z.enum(["all", "buyer", "seller"]).default("all") }).parse(req.query);
  const or = [...(p.role !== "seller" ? [{ buyerId: req.auth!.userId }] : []), ...(p.role !== "buyer" ? [{ sellerId: req.auth!.userId }] : [])];
  const filter = { $or: or };
  const [data, total] = await Promise.all([BookingModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip((p.page - 1) * p.pageSize).limit(p.pageSize).lean(), BookingModel.countDocuments(filter)]);
  res.json({ success: true, data, meta: { page: p.page, pageSize: p.pageSize, total } });
});

router.post("/", async (req, res) => {
  const input = z.object({ vehicleId: z.string().refine(Types.ObjectId.isValid), startDate: z.coerce.date(), endDate: z.coerce.date() }).strict().refine((v) => v.startDate > new Date() && v.endDate >= v.startDate, "Rental dates must be future dates and endDate cannot precede startDate.").parse(req.body);
  const session = await mongoose.startSession();
  let created: { id: string; status: string; paymentStatus: string; amount: number; currency: string } | undefined;
  try {
    await session.withTransaction(async () => {
      // Updating a shared vehicle document serializes overlapping reservation attempts.
      const vehicle = await VehicleModel.findOneAndUpdate({ _id: input.vehicleId, moderationStatus: "published", availabilityStatus: "available", listingType: { $in: ["rent", "sale_and_rent"] }, sellerId: { $ne: req.auth!.userId }, deletedAt: null }, { $inc: { availabilityVersion: 1 } }, { new: true, session }).select("sellerId rentalPricing currency").lean();
      if (!vehicle) throw new HttpError(404, "NOT_AVAILABLE", "Rental vehicle is unavailable or belongs to this account.");
      const now = new Date();
      const conflict = await BookingModel.exists({ vehicleId: input.vehicleId, $or: [{ status: "confirmed" }, { status: "pending", expiresAt: { $gt: now } }], startDate: { $lte: input.endDate }, endDate: { $gte: input.startDate } }).session(session);
      if (conflict) throw new HttpError(409, "DATES_UNAVAILABLE", "Those dates are no longer available.");
      const days = Math.max(1, Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / 86400000) + 1);
      const [booking] = await BookingModel.create([{ vehicleId: input.vehicleId, buyerId: req.auth!.userId, sellerId: vehicle.sellerId, bookingType: "rental", startDate: input.startDate, endDate: input.endDate, amount: (vehicle.rentalPricing?.day ?? 0) * days, currency: vehicle.currency, expiresAt: new Date(Date.now() + 15 * 60_000) }], { session });
      created = { id: String(booking._id), status: booking.status, paymentStatus: booking.paymentStatus, amount: booking.amount, currency: booking.currency };
    });
  } finally {
    await session.endSession();
  }
  if (!created) throw new HttpError(500, "BOOKING_FAILED", "Booking could not be created.");
  res.status(201).json({ success: true, data: created, meta: { pendingExpiresAt: new Date(Date.now() + 15 * 60_000) } });
});

router.get("/:id", async (req, res) => {
  const id = String(req.params.id); if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Booking ID is invalid.");
  const data = await BookingModel.findOne({ _id: id, $or: [{ buyerId: req.auth!.userId }, { sellerId: req.auth!.userId }] }).select("-__v").lean();
  if (!data) throw new HttpError(404, "NOT_FOUND", "Booking not found.");
  res.json({ success: true, data, meta: {} });
});

router.post("/:id/cancel", async (req, res) => {
  const id = String(req.params.id); if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Booking ID is invalid.");
  const { reason } = z.object({ reason: z.string().trim().max(1000).optional() }).strict().parse(req.body ?? {});
  const b = await BookingModel.findOneAndUpdate({ _id: id, $or: [{ buyerId: req.auth!.userId }, { sellerId: req.auth!.userId }], status: { $in: ["pending", "confirmed"] } }, { $set: { status: "cancelled", cancelledAt: new Date(), cancellationReason: reason } }, { new: true });
  if (!b) throw new HttpError(404, "NOT_FOUND_OR_CANNOT_CANCEL", "Booking not found or cannot be cancelled.");
  res.json({ success: true, data: { id: String(b._id), status: b.status }, meta: {} });
});

router.post("/:id/extend", async (req, res) => {
  const id = String(req.params.id); if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Booking ID is invalid.");
  const { endDate } = z.object({ endDate: z.coerce.date() }).parse(req.body);
  const session = await mongoose.startSession(); let updated: { endDate: Date; amount: number } | undefined;
  try {
    await session.withTransaction(async () => {
      const booking = await BookingModel.findOne({ _id: id, buyerId: req.auth!.userId, bookingType: "rental", status: "confirmed" }).session(session);
      if (!booking || !booking.endDate || endDate <= booking.endDate) throw new HttpError(409, "INVALID_EXTENSION", "Only confirmed rentals can be extended to a later end date.");
      const vehicle = await VehicleModel.findByIdAndUpdate(booking.vehicleId, { $inc: { availabilityVersion: 1 } }, { new: true, session }).select("rentalPricing").lean();
      if (!vehicle) throw new HttpError(404, "NOT_FOUND", "Vehicle not found.");
      const conflict = await BookingModel.exists({ _id: { $ne: booking._id }, vehicleId: booking.vehicleId, $or: [{ status: "confirmed" }, { status: "pending", expiresAt: { $gt: new Date() } }], startDate: { $lte: endDate }, endDate: { $gt: booking.endDate } }).session(session);
      if (conflict) throw new HttpError(409, "DATES_UNAVAILABLE", "The extension overlaps another booking.");
      const addedDays = Math.ceil((endDate.getTime() - booking.endDate.getTime()) / 86400000);
      booking.amount += (vehicle.rentalPricing?.day ?? 0) * addedDays;
      booking.endDate = endDate;
      booking.expiresAt = undefined;
      await booking.save({ session });
      updated = { endDate: booking.endDate, amount: booking.amount };
    });
  } finally { await session.endSession(); }
  res.json({ success: true, data: { id, ...updated }, meta: {} });
});

router.post("/:id/handover", async (req, res) => {
  const id = String(req.params.id); if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Booking ID is invalid.");
  const input = z.object({ event: z.enum(["check_in", "check_out"]), notes: z.string().trim().max(2000).optional() }).strict().parse(req.body);
  const booking = await BookingModel.findOne({ _id: id, sellerId: req.auth!.userId, bookingType: "rental", status: "confirmed" });
  if (!booking) throw new HttpError(404, "NOT_FOUND", "Confirmed rental booking not found.");
  if (input.event === "check_in") {
    if (booking.checkInAt || booking.checkOutAt) throw new HttpError(409, "INVALID_STATE", "Check-in has already been recorded.");
    booking.checkInAt = new Date(); booking.handoverNotes = input.notes;
  } else {
    if (!booking.checkInAt || booking.checkOutAt) throw new HttpError(409, "INVALID_STATE", "Check-in is required before check-out.");
    booking.checkOutAt = new Date(); booking.status = "completed"; booking.handoverNotes = input.notes ?? booking.handoverNotes;
  }
  await booking.save();
  res.json({ success: true, data: { id, checkInAt: booking.checkInAt, checkOutAt: booking.checkOutAt, status: booking.status }, meta: {} });
});

router.post("/:id/disputes", async (req, res) => {
  const id = String(req.params.id); if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Booking ID is invalid.");
  const input = z.object({ reason: z.string().trim().min(3).max(120), description: z.string().trim().max(4000).optional() }).strict().parse(req.body);
  const booking = await BookingModel.exists({ _id: id, $or: [{ buyerId: req.auth!.userId }, { sellerId: req.auth!.userId }] });
  if (!booking) throw new HttpError(404, "NOT_FOUND", "Booking not found.");
  const report = await ReportModel.create({ reporterId: req.auth!.userId, bookingId: id, reason: input.reason, description: input.description });
  res.status(201).json({ success: true, data: { id: String(report._id), status: report.status }, meta: {} });
});

export default router;
