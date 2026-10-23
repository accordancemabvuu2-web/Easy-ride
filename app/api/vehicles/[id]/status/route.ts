import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { VehicleModel } from "@/models";
const bodySchema=z.object({status:z.enum(["draft","pending_review","paused","archived"])}).strict();
export async function PATCH(req:NextRequest,c:{params:Promise<{id:string}>}){const{id}=await c.params;if(!/^[a-f\d]{24}$/i.test(id))return NextResponse.json({error:"Invalid vehicle ID."},{status:400});const user=await getSessionUser();if(!user)return NextResponse.json({error:"Sign in to manage your listing."},{status:401});const p=bodySchema.safeParse(await req.json().catch(()=>null));if(!p.success)return NextResponse.json({error:"Unsupported listing status."},{status:400});try{await connectMongo();const d=await VehicleModel.findById(id);if(!d)return NextResponse.json({error:"Listing not found."},{status:404});if(d.owner_id!==String(user._id)&&user.role!=="admin")return NextResponse.json({error:"You can only manage your own listing."},{status:403});d.status=p.data.status;await d.save();return NextResponse.json({data:{id:String(d._id),status:d.status,updated_at:d.updated_at}});}catch{return NextResponse.json({error:"Unable to update listing status."},{status:503});}}
