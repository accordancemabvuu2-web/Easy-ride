import mongoose,{Schema,model} from "mongoose";
const schema=new Schema({vehicleId:{type:Schema.Types.ObjectId,ref:"Vehicle",required:true,index:true},ownerId:{type:Schema.Types.ObjectId,ref:"User",required:true,index:true},imageUrl:{type:String,required:true,maxlength:2048},storageProvider:{type:String,required:true},storageKey:{type:String,required:true},thumbnailUrl:String,displayOrder:{type:Number,default:0,min:0},moderationStatus:{type:String,enum:["pending","approved","rejected"],default:"pending"}},{timestamps:{createdAt:true,updatedAt:false}});
schema.index({vehicleId:1,displayOrder:1});
export const VehicleImageModel=mongoose.models.VehicleImage??model("VehicleImage",schema);
