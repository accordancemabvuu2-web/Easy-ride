import mongoose,{Schema,model} from "mongoose";
const schema=new Schema({conversationId:{type:Schema.Types.ObjectId,ref:"Conversation",required:true},senderId:{type:Schema.Types.ObjectId,ref:"User",required:true},messageType:{type:String,enum:["text","image"],default:"text"},text:{type:String,maxlength:5000},attachment:{storageProvider:String,storageKey:String,mimeType:String,sizeBytes:Number},readAt:Date},{timestamps:{createdAt:true,updatedAt:false}});
schema.index({conversationId:1,createdAt:-1});
export const MessageModel=mongoose.models.Message??model("Message",schema);
