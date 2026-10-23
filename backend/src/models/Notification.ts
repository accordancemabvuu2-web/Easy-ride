import mongoose,{Schema,model} from "mongoose";
const schema=new Schema({userId:{type:Schema.Types.ObjectId,ref:"User",required:true,index:true},type:{type:String,required:true,maxlength:80},title:{type:String,required:true,maxlength:160},message:{type:String,required:true,maxlength:2000},resourceType:String,resourceId:Schema.Types.ObjectId,readAt:Date},{timestamps:{createdAt:true,updatedAt:false}});
schema.index({userId:1,readAt:1,createdAt:-1});
export const NotificationModel=mongoose.models.Notification??model("Notification",schema);
