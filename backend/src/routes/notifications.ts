import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import { NotificationModel } from "../models/Notification.js";
import { authenticate } from "../middleware/auth.js";
import { HttpError } from "../middleware/errors.js";

const router = Router();
router.use(authenticate);
router.get("/", async (req, res) => {
  const { page, pageSize, unreadOnly } = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(24), unreadOnly: z.enum(["true", "false"]).default("false") }).parse(req.query);
  const filter = { userId: req.auth!.userId, ...(unreadOnly === "true" ? { readAt: null } : {}) };
  const [data, total] = await Promise.all([
    NotificationModel.find(filter).select("type title message resourceType resourceId readAt createdAt").sort({ createdAt: -1, _id: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    NotificationModel.countDocuments(filter),
  ]);
  res.json({ success: true, data, meta: { page, pageSize, total } });
});
router.patch("/:id/read", async (req, res) => {
  const id = String(req.params.id);
  if (!Types.ObjectId.isValid(id)) throw new HttpError(400, "INVALID_ID", "Notification ID is invalid.");
  const notification = await NotificationModel.findOneAndUpdate({ _id: id, userId: req.auth!.userId, readAt: null }, { $set: { readAt: new Date() } }, { new: true }).select("type title message readAt createdAt").lean();
  if (!notification) {
    const exists = await NotificationModel.exists({ _id: id, userId: req.auth!.userId });
    if (!exists) throw new HttpError(404, "NOT_FOUND", "Notification not found.");
    return res.json({ success: true, data: { read: true }, meta: {} });
  }
  res.json({ success: true, data: notification, meta: {} });
});

export default router;
