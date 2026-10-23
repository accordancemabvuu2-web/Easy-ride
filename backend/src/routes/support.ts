import { Router } from "express";
import mongoose, { Types } from "mongoose";
import { z } from "zod";
import { SupportTicketModel } from "../models/SupportTicket.js";
import { SupportTicketMessageModel } from "../models/SupportTicketMessage.js";
import { UserModel } from "../models/User.js";
import { authenticate } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";

const router = Router();
const paging = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(30) });
router.use(authenticate);
router.get("/", async (req, res) => {
  const { page, pageSize } = paging.parse(req.query);
  const filter = { userId: req.auth!.userId };
  const [data, total] = await Promise.all([SupportTicketModel.find(filter).select("subject category status lastMessageAt createdAt updatedAt").sort({ lastMessageAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(), SupportTicketModel.countDocuments(filter)]);
  res.json({ success: true, data, meta: { page, pageSize, total } });
});
router.post("/", async (req, res) => {
  const input = z.object({ subject: z.string().trim().min(3).max(160), category: z.enum(["account", "listing", "booking", "payment", "safety", "other"]).default("other"), message: z.string().trim().min(1).max(5000) }).strict().parse(req.body);
  const session = await mongoose.startSession();
  let createdId = "";
  try {
    await session.withTransaction(async () => {
      const [ticket] = await SupportTicketModel.create([{ userId: req.auth!.userId, subject: input.subject, category: input.category, lastMessageAt: new Date() }], { session });
      await SupportTicketMessageModel.create([{ ticketId: ticket._id, senderId: req.auth!.userId, body: input.message }], { session });
      createdId = String(ticket._id);
    });
  } finally {
    await session.endSession();
  }
  res.status(201).json({ success: true, data: { id: createdId, status: "open" }, meta: {} });
});
router.get("/:id/messages", async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Support ticket ID is invalid.");
  const ticket = await SupportTicketModel.findById(id).select("userId").lean();
  const admin = ticket && String(ticket.userId) !== req.auth!.userId ? await UserModel.exists({ _id: req.auth!.userId, role: "admin", accountStatus: "active" }) : false;
  if (!ticket || (String(ticket.userId) !== req.auth!.userId && !admin)) throw new HttpError(404, "NOT_FOUND", "Support ticket not found.");
  const { page, pageSize } = paging.parse(req.query);
  const filter = { ticketId: id };
  const [data, total] = await Promise.all([SupportTicketMessageModel.find(filter).select("senderId body createdAt").sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(), SupportTicketMessageModel.countDocuments(filter)]);
  res.json({ success: true, data, meta: { page, pageSize, total } });
});
router.post("/:id/messages", async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Support ticket ID is invalid.");
  const { body } = z.object({ body: z.string().trim().min(1).max(5000) }).strict().parse(req.body);
  const ticket = await SupportTicketModel.findById(id).select("userId status");
  if (!ticket) throw new HttpError(404, "NOT_FOUND", "Support ticket not found.");
  const isOwner = String(ticket.userId) === req.auth!.userId;
  const admin = isOwner ? false : await UserModel.exists({ _id: req.auth!.userId, role: "admin", accountStatus: "active" });
  if (!isOwner && !admin) throw new HttpError(404, "NOT_FOUND", "Support ticket not found.");
  if (ticket.status === "closed") throw new HttpError(409, "TICKET_CLOSED", "Closed tickets cannot receive messages.");
  const message = await SupportTicketMessageModel.create({ ticketId: id, senderId: req.auth!.userId, body });
  ticket.lastMessageAt = message.createdAt;
  if (admin) ticket.status = "waiting_for_user";
  else if (ticket.status === "waiting_for_user") ticket.status = "in_progress";
  await ticket.save();
  res.status(201).json({ success: true, data: { id: String(message._id), body: message.body, createdAt: message.createdAt }, meta: {} });
});
export default router;
