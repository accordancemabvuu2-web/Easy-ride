import mongoose,{Schema,model} from "mongoose";
const schema=new Schema({participantIds:{type:[{type:Schema.Types.ObjectId,ref:"User"}],required:true,validate:{validator:(v:unknown[])=>v.length===2,message:"Conversations must have two participants."}},vehicleId:{type:Schema.Types.ObjectId,ref:"Vehicle"},lastMessageAt:{type:Date,index:true}},{timestamps:true});
schema.index({participantIds:1,lastMessageAt:-1});
export const ConversationModel=mongoose.models.Conversation??model("Conversation",schema);
