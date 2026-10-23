import mongoose,{Schema,model} from "mongoose";
const schema=new Schema({userId:{type:Schema.Types.ObjectId,ref:"User",required:true,index:true},tokenHash:{type:String,required:true,unique:true,select:false},purpose:{type:String,enum:["verify_email","verify_phone","reset_password"],required:true},expiresAt:{type:Date,required:true},consumedAt:Date},{timestamps:{createdAt:true,updatedAt:false}});
schema.index({expiresAt:1},{expireAfterSeconds:0});
export const VerificationTokenModel=mongoose.models.VerificationToken??model("VerificationToken",schema);
