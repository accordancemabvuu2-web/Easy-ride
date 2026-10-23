import mongoose, { Schema, model } from "mongoose";

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true },
  viewedAt: { type: Date, default: Date.now, required: true },
}, { timestamps: false });
schema.index({ userId: 1, vehicleId: 1 }, { unique: true });
schema.index({ userId: 1, viewedAt: -1 });
export const RecentlyViewedVehicleModel = mongoose.models.RecentlyViewedVehicle ?? model("RecentlyViewedVehicle", schema);
