import { NextRequest, NextResponse } from "next/server";
import { createVehicleSchema } from "@/lib/vehicles/validation";
import { getSessionUser } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { ProfileModel, VehicleModel } from "@/models";
import { Types } from "mongoose";
const PAGE_SIZE_MAX = 48;
function serialize(doc: any) { return { ...doc, id: String(doc._id), _id: undefined }; }
export async function GET(request: NextRequest) {
  try {
    await connectMongo();
    const p = request.nextUrl.searchParams;
    const page = Math.max(1, Number.parseInt(p.get("page") || "1", 10) || 1);
    const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, Number.parseInt(p.get("pageSize") || "24", 10) || 24));
    const filter: Record<string, any> = { status: "active" };
    const mode = p.get("mode"); if (mode === "buy") filter.listing_type = { $in: ["sale", "sale_and_rent", "buy"] }; if (mode === "rent") filter.listing_type = { $in: ["rent", "sale_and_rent"] };
    if (p.get("make")) filter.make = new RegExp(`^${p.get("make")!.slice(0,80).replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}$`, "i");
    if (p.get("city")) filter.city = new RegExp(p.get("city")!.slice(0,80).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"), "i");
    if (p.get("q")) { const q = p.get("q")!.replace(/[^a-zA-Z0-9\s-]/g," ").trim().slice(0,80); if(q) filter.$or = ["make","model","description"].map((field)=>({[field]:{$regex:q,$options:"i"}})); }
    const sort = p.get("sort"); const price = mode === "rent" ? "rent_day_price" : "sale_price";
    const ordering: Record<string, 1|-1> = sort === "price_asc" ? { [price]: 1 } : sort === "price_desc" ? { [price]: -1 } : { published_at: -1, created_at: -1 };
    const [data,total] = await Promise.all([VehicleModel.find(filter).sort(ordering).skip((page-1)*pageSize).limit(pageSize).lean(),VehicleModel.countDocuments(filter)]);
    return NextResponse.json({ data: data.map(serialize), page, pageSize, total });
  } catch(error) { console.error("Vehicle search failed",error instanceof Error?error.message:"unknown error"); return NextResponse.json({error:"Unable to load vehicles."},{status:503}); }
}
export async function POST(request: NextRequest) {
  const user = await getSessionUser(); if(!user) return NextResponse.json({error:"Sign in to create a listing."},{status:401});
  const parsed = createVehicleSchema.safeParse(await request.json().catch(()=>null)); if(!parsed.success) return NextResponse.json({error:"Please check the listing details.",details:parsed.error.flatten()},{status:400});
  try {
    await connectMongo(); const i=parsed.data;
    if(i.dealer_id && i.dealer_id !== String(user._id)) return NextResponse.json({error:"You cannot create a listing for another dealer."},{status:403});
    const body=await request.clone().json().catch(()=>({}));
    const data=await VehicleModel.create({owner_id:String(user._id),dealer_id:user.role==="dealer"?String(user._id):null,listing_type:i.listing_type,status:"pending_review",make:i.make,model:i.model,trim:i.trim||null,year:i.year,mileage_km:i.mileage_km??null,condition:i.condition,fuel_type:i.fuel_type||null,transmission:i.transmission||null,body_type:i.body_type||null,engine:i.engine||null,drivetrain:i.drivetrain||null,seat_count:i.seat_count??null,exterior_color:i.exterior_color||null,sale_price:typeof i.sale_price==="number"?i.sale_price:null,rent_day_price:typeof i.rent_day_price==="number"?i.rent_day_price:null,rent_week_price:typeof i.rent_week_price==="number"?i.rent_week_price:null,rent_month_price:typeof i.rent_month_price==="number"?i.rent_month_price:null,currency:i.currency.toUpperCase(),country_code:i.country_code||null,city:i.city||null,address_label:i.address_label||null,latitude:typeof i.latitude==="number"?i.latitude:null,longitude:typeof i.longitude==="number"?i.longitude:null,description:i.description,images:Array.isArray(body.images)?body.images.slice(0,10).map((url:string,index:number)=>({storage_path:url,display_order:index})):[]});
    return NextResponse.json({data:{id:String(data._id),status:data.status}},{status:201});
  } catch(error) { console.error("Listing create failed",error instanceof Error?error.message:"unknown error"); return NextResponse.json({error:"Listing could not be saved."},{status:503}); }
}
