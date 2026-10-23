import mongoose,{Schema,model} from "mongoose";
const schema=new Schema({reporterId:{type:Schema.Types.ObjectId,ref:"User",required:true,index:true},reportedUserId:{type:Schema.Types.ObjectId,ref:"User"},vehicleId:{type:Schema.Types.ObjectId,ref:"Vehicle"},reviewId:{type:Schema.Types.ObjectId,ref:"Review"},bookingId:{type:Schema.Types.ObjectId,ref:"Booking"},reason:{type:String,required:true,maxlength:120},description:{type:String,maxlength:4000},status:{type:String,enum:["open","investigating","resolved","dismissed"],default:"open",index:true},assignedAdminId:{type:Schema.Types.ObjectId,ref:"User"},resolution:{type:String,maxlength:4000}},{timestamps:true});
schema.index({status:1,createdAt:1});
export const ReportModel=mongoose.models.Report??model("Report",schema);
