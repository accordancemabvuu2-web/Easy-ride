import{NextRequest,NextResponse}from"next/server";import{z}from"zod";
const schema=z.object({email:z.string().trim().email().max(254)});
export async function POST(req:NextRequest){const p=schema.safeParse(await req.json().catch(()=>null));if(!p.success)return NextResponse.json({error:"Enter a valid email address."},{status:400});return NextResponse.json({error:"Password reset email delivery is not configured. Contact Easy Ride support to reset your account password."},{status:501});}
