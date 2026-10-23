import mongoose, { Schema, model } from "mongoose";

const schema = new Schema({
  ticketId: { type: Schema.Types.ObjectId, ref: "SupportTicket", required: true },
  senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  body: { type: String, required: true, maxlength: 5000 },
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ ticketId: 1, createdAt: -1 });
export const SupportTicketMessageModel = mongoose.models.SupportTicketMessage ?? model("SupportTicketMessage", schema);
