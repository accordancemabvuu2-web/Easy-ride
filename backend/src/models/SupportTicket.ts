import mongoose, { Schema, model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  subject: { type: String, required: true, trim: true, maxlength: 160 },
  category: { type: String, enum: ["account", "listing", "booking", "payment", "safety", "other"], default: "other" },
  status: { type: String, enum: ["open", "in_progress", "waiting_for_user", "resolved", "closed"], default: "open", index: true },
  lastMessageAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });
schema.index({ userId: 1, updatedAt: -1 });
export const SupportTicketModel = mongoose.models.SupportTicket ?? model("SupportTicket", schema);
