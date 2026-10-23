import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { BookingModel } from "../models/Booking.js";
import { PaymentModel } from "../models/Payment.js";
import { authenticate } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";
import { paymentProvider } from "../services/payments.js";

const router = Router();
router.use(authenticate);
router.get("/me", async (req, res) => {
  const { page, pageSize } = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(24) }).parse(req.query);
  const filter = { $or: [{ payerId: req.auth!.userId }, { payeeId: req.auth!.userId }] };
  const [data, total] = await Promise.all([PaymentModel.find(filter).select("bookingId payerId payeeId amount currency provider status createdAt updatedAt").sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(), PaymentModel.countDocuments(filter)]);
  res.json({ success: true, data, meta: { page, pageSize, total } });
});
router.post("/checkout", async (req, res) => {
  const { bookingId, returnUrl } = z.object({ bookingId: z.string().refine(Types.ObjectId.isValid), returnUrl: z.string().url().optional() }).strict().parse(req.body);
  const idempotencyKey = z.string().min(16).max(128).parse(req.header("Idempotency-Key"));
  const booking = await BookingModel.findOne({ _id: bookingId, buyerId: req.auth!.userId, status: { $in: ["pending", "confirmed"] }, paymentStatus: { $in: ["unpaid", "pending"] } }).select("amount currency").lean();
  if (!booking) throw new HttpError(404, "PAYABLE_BOOKING_NOT_FOUND", "A payable booking belonging to this account was not found.");
  const checkout = await paymentProvider.createCheckout({ paymentId: bookingId, amount: booking.amount, currency: booking.currency, returnUrl }, idempotencyKey);
  res.status(201).json({ success: true, data: checkout, meta: {} });
});
router.get("/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Payment ID is invalid.");
  const payment = await PaymentModel.findOne({ _id: id, $or: [{ payerId: req.auth!.userId }, { payeeId: req.auth!.userId }] }).select("bookingId payerId payeeId amount currency provider status createdAt updatedAt").lean();
  if (!payment) throw new HttpError(404, "NOT_FOUND", "Payment not found.");
  res.json({ success: true, data: payment, meta: {} });
});
export default router;
