import mongoose,{Schema,model} from "mongoose";
const schema=new Schema({bookingId:{type:Schema.Types.ObjectId,ref:"Booking",required:true,index:true},payerId:{type:Schema.Types.ObjectId,ref:"User",required:true},payeeId:{type:Schema.Types.ObjectId,ref:"User"},amount:{type:Number,required:true,min:0},currency:{type:String,required:true,uppercase:true,length:3},provider:{type:String,required:true},providerTransactionId:{type:String},status:{type:String,enum:["created","pending","succeeded","failed","refunded"],default:"created"},idempotencyKey:{type:String,required:true,unique:true,select:false}},{timestamps:true});
schema.index({provider:1,providerTransactionId:1},{unique:true,sparse:true});
export const PaymentModel=mongoose.models.Payment??model("Payment",schema);
