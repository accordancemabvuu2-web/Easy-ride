import mongoose,{Schema,model} from "mongoose";
const schema=new Schema({actorId:{type:Schema.Types.ObjectId,ref:"User"},action:{type:String,required:true,maxlength:120},resourceType:{type:String,required:true,maxlength:80},resourceId:{type:String,maxlength:100},metadata:{type:Schema.Types.Mixed,default:{}},timestamp:{type:Date,default:Date.now,index:true}},{versionKey:false,strict:true});
schema.pre(["updateOne","updateMany","findOneAndUpdate","deleteOne","deleteMany"],function(){throw new Error("Audit records are append-only.");});
schema.index({resourceType:1,resourceId:1,timestamp:-1});
export const AuditLogModel=mongoose.models.AuditLog??model("AuditLog",schema);
