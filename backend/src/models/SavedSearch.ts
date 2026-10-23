import mongoose,{Schema,model} from "mongoose";
const schema=new Schema({userId:{type:Schema.Types.ObjectId,ref:"User",required:true,index:true},name:{type:String,required:true,trim:true,maxlength:100},criteria:{type:Schema.Types.Mixed,default:{}},notificationPreferences:{email:{type:Boolean,default:false},push:{type:Boolean,default:false}},lastNotifiedAt:Date},{timestamps:true});
schema.index({userId:1,updatedAt:-1});
export const SavedSearchModel=mongoose.models.SavedSearch??model("SavedSearch",schema);
