import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { ConversationModel } from "../models/Conversation.js";
import { MessageModel } from "../models/Message.js";
import { NotificationModel } from "../models/Notification.js";
import { UserModel } from "../models/User.js";
import { VehicleModel } from "../models/Vehicle.js";
import { authenticate } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";

const router = Router();
const paging = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(30) });
router.use(authenticate);

router.get("/", async (req, res) => {
  const { page, pageSize } = paging.parse(req.query);
  const filter = { participantIds: req.auth!.userId };
  const [data, total] = await Promise.all([
    ConversationModel.find(filter).sort({ lastMessageAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).populate({ path: "participantIds", select: "firstName lastName avatarUrl" }).populate({ path: "vehicleId", select: "make model year" }).lean(),
    ConversationModel.countDocuments(filter),
  ]);
  res.json({ success: true, data, meta: { page, pageSize, total } });
});

router.post("/", async (req, res) => {
  const input = z.object({ vehicleId: z.string().refine(Types.ObjectId.isValid) }).strict().parse(req.body);
  const vehicle = await VehicleModel.findOne({ _id: input.vehicleId, moderationStatus: "published", deletedAt: null }).select("sellerId").lean();
  if (!vehicle) throw new HttpError(404, "NOT_FOUND", "Vehicle not found.");
  const sellerId = String(vehicle.sellerId);
  if (sellerId === req.auth!.userId) throw new HttpError(400, "OWN_LISTING", "You cannot start a conversation with yourself.");
  let conversation = await ConversationModel.findOne({ vehicleId: input.vehicleId, participantIds: { $all: [req.auth!.userId, sellerId], $size: 2 } });
  if (!conversation) conversation = await ConversationModel.create({ vehicleId: input.vehicleId, participantIds: [req.auth!.userId, sellerId] });
  res.status(201).json({ success: true, data: { id: String(conversation._id), vehicleId: String(conversation.vehicleId), participantIds: conversation.participantIds.map(String), createdAt: conversation.createdAt }, meta: {} });
});

router.get("/:id/messages", async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Conversation ID is invalid.");
  const conversation = await ConversationModel.findOne({ _id: id, participantIds: req.auth!.userId }).select("_id").lean();
  if (!conversation) throw new HttpError(404, "NOT_FOUND", "Conversation not found.");
  const { page, pageSize } = paging.parse(req.query);
  const filter = { conversationId: id };
  const [data, total] = await Promise.all([
    MessageModel.find(filter).select("senderId messageType text attachment.mimeType attachment.sizeBytes readAt createdAt").sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    MessageModel.countDocuments(filter),
  ]);
  await MessageModel.updateMany({ conversationId: id, senderId: { $ne: req.auth!.userId }, readAt: null }, { $set: { readAt: new Date() } });
  res.json({ success: true, data, meta: { page, pageSize, total } });
});

router.post("/:id/messages", async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Conversation ID is invalid.");
  const input = z.object({ text: z.string().trim().min(1).max(5000) }).strict().parse(req.body);
  const conversation = await ConversationModel.findOne({ _id: id, participantIds: req.auth!.userId }).select("participantIds vehicleId").lean();
  if (!conversation) throw new HttpError(404, "NOT_FOUND", "Conversation not found.");
  const message = await MessageModel.create({ conversationId: id, senderId: req.auth!.userId, messageType: "text", text: input.text });
  await ConversationModel.updateOne({ _id: id }, { $set: { lastMessageAt: message.createdAt } });
  const recipientId = (conversation.participantIds as Types.ObjectId[]).find((participantId: Types.ObjectId) => String(participantId) !== req.auth!.userId);
  if (recipientId) {
    const sender = await UserModel.findById(req.auth!.userId).select("firstName").lean();
    await NotificationModel.create({ userId: recipientId, type: "new_message", title: "New message", message: `${sender?.firstName ?? "A user"} sent you a message.`, resourceType: "conversation", resourceId: conversation._id });
  }
  res.status(201).json({ success: true, data: { id: String(message._id), conversationId: id, senderId: req.auth!.userId, text: message.text, readAt: null, createdAt: message.createdAt }, meta: {} });
});

export default router;
