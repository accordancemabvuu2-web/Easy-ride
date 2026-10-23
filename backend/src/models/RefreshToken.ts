import mongoose, { Schema, model } from "mongoose";
const schema = new Schema({ userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true }, tokenHash: { type: String, required: true, unique: true, select: false }, expiresAt: { type: Date, required: true }, revokedAt: Date, replacedBy: String, userAgent: String, ip: String }, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const RefreshTokenModel = mongoose.models.RefreshToken ?? model("RefreshToken", schema);
