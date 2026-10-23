import { NextResponse } from "next/server";
import { getSessionUser, publicProfile } from "@/lib/auth";
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ user: null, profile: null, staffRoles: [] });
    return NextResponse.json({ user: { id: String(user._id), email: user.email }, profile: publicProfile(user), staffRoles: user.staff_roles ?? [] });
  } catch (error) { console.error("Session lookup failed", error instanceof Error ? error.message : "unknown error"); return NextResponse.json({ error: "Unable to load account information." }, { status: 503 }); }
}
