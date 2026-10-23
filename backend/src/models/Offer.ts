import mongoose, { Schema, model } from "mongoose";
const schema=new Schema({vehicleId:{type:Schema.Types.ObjectId,ref:"Vehicle",required:true,index:true},buyerId:{type:Schema.Types.ObjectId,ref:"User",required:true,index:true},sellerId:{type:Schema.Types.ObjectId,ref:"User",required:true,index:true},amount:{type:Number,required:true,min:0},currency:{type:String,required:true,uppercase:true},message:{type:String,maxlength:2000},status:{type:String,enum:["pending","accepted","rejected","withdrawn","expired"],default:"pending",index:true},expiresAt:Date},{timestamps:true});
schema.index({buyerId:1,createdAt:-1});schema.index({sellerId:1,status:1,createdAt:-1});
export const OfferModel=mongoose.models.Offer??model("Offer",schema);
