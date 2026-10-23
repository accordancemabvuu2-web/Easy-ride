import mongoose, { Schema, model } from "mongoose";
const schema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, vehicleId: { type: Schema.Types.ObjectId, ref: "Vehicle", required: true } }, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ userId: 1, vehicleId: 1 }, { unique: true }); schema.index({ userId: 1, createdAt: -1 });
export const SavedVehicleModel = mongoose.models.SavedVehicle ?? model("SavedVehicle", schema);
