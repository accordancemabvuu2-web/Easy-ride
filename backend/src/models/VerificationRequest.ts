import mongoose, { Schema, model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle" },
  type: { type: String, enum: ["identity", "vehicle_ownership", "vehicle_history"], required: true },
  status: { type: String, enum: ["pending", "approved", "rejected", "unavailable"], default: "pending", index: true },
  note: { type: String, maxlength: 2000 },
  reviewReason: { type: String, maxlength: 1000 },
  reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  reviewedAt: Date,
}, { timestamps: true });
schema.index({ status: 1, createdAt: 1 });
export const VerificationRequestModel = mongoose.models.VerificationRequest ?? model("VerificationRequest", schema);
