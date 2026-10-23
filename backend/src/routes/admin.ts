import { Router } from "express";
import mongoose, { Types } from "mongoose";
import { z } from "zod";
import { AuditLogModel } from "../models/AuditLog.js";
import { BookingModel } from "../models/Booking.js";
import { DealerProfileModel } from "../models/DealerProfile.js";
import { OfferModel } from "../models/Offer.js";
import { PaymentModel } from "../models/Payment.js";
import { ReportModel } from "../models/Report.js";
import { ReviewModel } from "../models/Review.js";
import { SupportTicketModel } from "../models/SupportTicket.js";
import { UserModel } from "../models/User.js";
import { VehicleModel } from "../models/Vehicle.js";
import { VerificationRequestModel } from "../models/VerificationRequest.js";
import { HttpError } from "../middleware/errors.js";
import { requireAdmin } from "../middleware/authorization.js";

const router = Router();
const paging = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(30) });
router.use(...requireAdmin);

async function audit(actorId: string, action: string, resourceType: string, resourceId: string, metadata: Record<string, string>) {
  await AuditLogModel.create({ actorId, action, resourceType, resourceId, metadata, timestamp: new Date() });
}

router.get("/dashboard", async (_req, res) => {
  const [users, dealersPending, vehiclesPending, openReports, openSupport, bookings, payments, offers] = await Promise.all([
    UserModel.countDocuments({ accountStatus: { $ne: "deleted" } }), DealerProfileModel.countDocuments({ verificationStatus: "pending" }),
    VehicleModel.countDocuments({ moderationStatus: "pending_review", deletedAt: null }), ReportModel.countDocuments({ status: { $in: ["open", "investigating"] } }),
    SupportTicketModel.countDocuments({ status: { $in: ["open", "in_progress", "waiting_for_user"] } }), BookingModel.countDocuments(), PaymentModel.countDocuments(), OfferModel.countDocuments(),
  ]);
  res.json({ success: true, data: { users, dealersPending, vehiclesPending, openReports, openSupport, bookings, payments, offers }, meta: {} });
});

router.get("/users", async (req, res) => {
  const { page, pageSize } = paging.parse(req.query);
  const status = z.enum(["all", "pending", "active", "suspended", "deleted"]).default("all").parse(req.query.status);
  const filter = status === "all" ? {} : { accountStatus: status };
  const [data, total] = await Promise.all([UserModel.find(filter).select("firstName lastName email phoneNumber role accountStatus createdAt lastLoginAt").sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(), UserModel.countDocuments(filter)]);
  res.json({ success: true, data, meta: { page, pageSize, total } });
});

router.patch("/users/:id/status", async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "User ID is invalid.");
  if (id === req.auth!.userId) throw new HttpError(400, "SELF_ACTION", "Administrators cannot change their own account status here.");
  const { accountStatus } = z.object({ accountStatus: z.enum(["active", "suspended"]) }).strict().parse(req.body);
  const user = await UserModel.findOneAndUpdate({ _id: id, role: { $ne: "admin" } }, { $set: { accountStatus } }, { new: true }).select("firstName lastName role accountStatus").lean();
  if (!user) throw new HttpError(404, "NOT_FOUND", "Manageable user not found.");
  await audit(req.auth!.userId, `user.${accountStatus}`, "user", id, { accountStatus });
  res.json({ success: true, data: user, meta: {} });
});

router.get("/vehicles", async (req, res) => {
  const { page, pageSize } = paging.parse(req.query);
  const status = z.enum(["draft", "pending_review", "published", "rejected"]).default("pending_review").parse(req.query.status);
  const filter = { moderationStatus: status, deletedAt: null };
  const [data, total] = await Promise.all([VehicleModel.find(filter).select("sellerId dealerId make model year condition description listingType salePrice rentalPricing currency city country createdAt").sort({ createdAt: 1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(), VehicleModel.countDocuments(filter)]);
  res.json({ success: true, data, meta: { page, pageSize, total } });
});

router.patch("/vehicles/:id/review", async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Vehicle ID is invalid.");
  const input = z.object({ decision: z.enum(["approve", "reject"]), reason: z.string().trim().max(1000).optional() }).strict().refine((v) => v.decision !== "reject" || Boolean(v.reason), "A rejection reason is required.").parse(req.body);
  const filter = { _id: id, moderationStatus: "pending_review", deletedAt: null };
  const update = input.decision === "approve" ? { moderationStatus: "published", publishedAt: new Date() } : { moderationStatus: "rejected" };
  const vehicle = await VehicleModel.findOneAndUpdate(filter, { $set: update }, { new: true }).select("make model moderationStatus publishedAt sellerId").lean();
  if (!vehicle) throw new HttpError(409, "INVALID_STATE", "Vehicle is not awaiting review.");
  await audit(req.auth!.userId, `vehicle.${input.decision}`, "vehicle", id, { reason: input.reason ?? "" });
  res.json({ success: true, data: vehicle, meta: {} });
});

router.get("/dealers", async (req, res) => {
  const { page, pageSize } = paging.parse(req.query);
  const status = z.enum(["pending", "verified", "rejected"]).default("pending").parse(req.query.status);
  const filter = { verificationStatus: status };
  const [data, total] = await Promise.all([DealerProfileModel.find(filter).select("userId businessName businessRegistrationNumber description contactEmail contactPhone verificationStatus createdAt").sort({ createdAt: 1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(), DealerProfileModel.countDocuments(filter)]);
  res.json({ success: true, data, meta: { page, pageSize, total } });
});

router.patch("/dealers/:id/review", async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Dealer ID is invalid.");
  const input = z.object({ decision: z.enum(["approve", "reject"]), reason: z.string().trim().max(1000).optional() }).strict().refine((v) => v.decision !== "reject" || Boolean(v.reason), "A rejection reason is required.").parse(req.body);
  const session = await mongoose.startSession();
  let result: { verificationStatus: string; businessName: string } | null = null;
  try {
    await session.withTransaction(async () => {
      const dealer = await DealerProfileModel.findOneAndUpdate({ _id: id, verificationStatus: "pending" }, { $set: { verificationStatus: input.decision === "approve" ? "verified" : "rejected", verificationReason: input.reason } }, { new: true, session }).select("userId businessName verificationStatus");
      if (!dealer) throw new HttpError(409, "INVALID_STATE", "Dealer application is not pending review.");
      const role = input.decision === "approve" ? "dealer" : "user";
      await UserModel.updateOne({ _id: dealer.userId }, { $set: { role } }, { session });
      await AuditLogModel.create([{ actorId: req.auth!.userId, action: `dealer.${input.decision}`, resourceType: "dealer", resourceId: id, metadata: { reason: input.reason ?? "" } }], { session });
      result = { verificationStatus: dealer.verificationStatus, businessName: dealer.businessName };
    });
  } finally {
    await session.endSession();
  }
  if (!result) throw new HttpError(500, "REVIEW_FAILED", "Dealer review could not be completed.");
  const output = result as { verificationStatus: string; businessName: string };
  res.json({ success: true, data: { id, ...output }, meta: {} });
});

router.get("/reports", async (req, res) => {
  const { page, pageSize } = paging.parse(req.query);
  const status = z.enum(["all", "open", "investigating", "resolved", "dismissed"]).default("open").parse(req.query.status);
  const filter = status === "all" ? {} : { status };
  const [data, total] = await Promise.all([ReportModel.find(filter).select("reporterId reportedUserId vehicleId reviewId bookingId reason description status assignedAdminId resolution createdAt updatedAt").sort({ createdAt: 1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(), ReportModel.countDocuments(filter)]);
  res.json({ success: true, data, meta: { page, pageSize, total } });
});

router.patch("/reports/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Report ID is invalid.");
  const input = z.object({ status: z.enum(["investigating", "resolved", "dismissed"]), resolution: z.string().trim().max(4000).optional() }).strict().refine((v) => v.status !== "resolved" || Boolean(v.resolution), "A resolution is required when closing a report.").parse(req.body);
  const report = await ReportModel.findByIdAndUpdate(id, { $set: { ...input, assignedAdminId: req.auth!.userId } }, { new: true, runValidators: true }).select("status resolution assignedAdminId updatedAt").lean();
  if (!report) throw new HttpError(404, "NOT_FOUND", "Report not found.");
  await audit(req.auth!.userId, `report.${input.status}`, "report", id, { status: input.status });
  res.json({ success: true, data: report, meta: {} });
});

router.get("/reviews", async (req, res) => {
  const { page, pageSize } = paging.parse(req.query);
  const [data, total] = await Promise.all([ReviewModel.find({ moderationStatus: "pending" }).select("reviewerId reviewedUserId dealerId vehicleId bookingId rating comment createdAt").sort({ createdAt: 1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(), ReviewModel.countDocuments({ moderationStatus: "pending" })]);
  res.json({ success: true, data, meta: { page, pageSize, total } });
});

router.patch("/reviews/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Review ID is invalid.");
  const { moderationStatus } = z.object({ moderationStatus: z.enum(["approved", "rejected"]) }).strict().parse(req.body);
  const review = await ReviewModel.findOneAndUpdate({ _id: id, moderationStatus: "pending" }, { $set: { moderationStatus } }, { new: true }).select("rating moderationStatus reviewedUserId dealerId vehicleId").lean();
  if (!review) throw new HttpError(404, "NOT_FOUND", "Pending review not found.");
  await audit(req.auth!.userId, `review.${moderationStatus}`, "review", id, { moderationStatus });
  res.json({ success: true, data: review, meta: {} });
});

router.get("/verification-requests", async (req, res) => {
  const { page, pageSize } = paging.parse(req.query);
  const [data, total] = await Promise.all([VerificationRequestModel.find({ status: "pending" }).select("userId vehicleId type status note createdAt").sort({ createdAt: 1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(), VerificationRequestModel.countDocuments({ status: "pending" })]);
  res.json({ success: true, data, meta: { page, pageSize, total } });
});

router.patch("/verification-requests/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Verification request ID is invalid.");
  const input = z.object({ status: z.enum(["approved", "rejected", "unavailable"]), reason: z.string().trim().max(1000).optional() }).strict();
  const decision = input.parse(req.body);
  if (decision.status === "rejected" && !decision.reason) throw new HttpError(400, "REASON_REQUIRED", "A rejection reason is required.");
  // This endpoint records a human decision; external identity/VIN checks are not represented as verified.
  const item = await VerificationRequestModel.findOneAndUpdate({ _id: id, status: "pending" }, { $set: { status: decision.status, reviewReason: decision.reason, reviewedBy: req.auth!.userId, reviewedAt: new Date() } }, { new: true }).select("userId vehicleId type status reviewReason reviewedAt").lean();
  if (!item) throw new HttpError(409, "INVALID_STATE", "Verification request is not pending.");
  await audit(req.auth!.userId, `verification.${decision.status}`, "verification_request", id, { type: item.type });
  res.json({ success: true, data: item, meta: {} });
});

router.get("/support", async (req, res) => {
  const { page, pageSize } = paging.parse(req.query);
  const status = z.enum(["all", "open", "in_progress", "waiting_for_user", "resolved", "closed"]).default("open").parse(req.query.status);
  const filter = status === "all" ? {} : { status };
  const [data, total] = await Promise.all([SupportTicketModel.find(filter).select("userId subject category status lastMessageAt createdAt updatedAt").sort({ lastMessageAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(), SupportTicketModel.countDocuments(filter)]);
  res.json({ success: true, data, meta: { page, pageSize, total } });
});

router.patch("/support/:id/status", async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Ticket ID is invalid.");
  const { status } = z.object({ status: z.enum(["open", "in_progress", "waiting_for_user", "resolved", "closed"]) }).strict().parse(req.body);
  const ticket = await SupportTicketModel.findByIdAndUpdate(id, { $set: { status } }, { new: true }).select("userId subject status updatedAt").lean();
  if (!ticket) throw new HttpError(404, "NOT_FOUND", "Support ticket not found.");
  await audit(req.auth!.userId, `support.${status}`, "support_ticket", id, { status });
  res.json({ success: true, data: ticket, meta: {} });
});

router.get("/audit-logs", async (req, res) => {
  const { page, pageSize } = paging.parse(req.query);
  const [data, total] = await Promise.all([AuditLogModel.find().select("actorId action resourceType resourceId metadata timestamp").sort({ timestamp: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(), AuditLogModel.countDocuments()]);
  res.json({ success: true, data, meta: { page, pageSize, total } });
});

export default router;
