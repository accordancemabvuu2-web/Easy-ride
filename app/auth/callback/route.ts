import { NextResponse } from "next/server";
export async function GET(request:Request){const url=new URL(request.url);const next=url.searchParams.get("next");const safe=next?.startsWith("/")&&!next.startsWith("//")?next:"/dashboard";return NextResponse.redirect(new URL(safe,url.origin));}
