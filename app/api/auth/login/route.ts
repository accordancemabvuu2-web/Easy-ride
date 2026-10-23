import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectMongo } from "@/lib/mongodb";
import { ProfileModel } from "@/models";
import { setSession } from "@/lib/auth";
const schema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) });
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  try {
    await connectMongo();
    const user = await ProfileModel.findOne({ email: parsed.data.email.toLowerCase() }).select("+password_hash");
    if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    if (user.account_status !== "active") return NextResponse.json({ error: "This account is not active." }, { status: 403 });
    await setSession(String(user._id));
    return NextResponse.json({ ok: true, user: { id: String(user._id), email: user.email } });
  } catch (error) { console.error("Login failed", error instanceof Error ? error.message : "unknown error"); return NextResponse.json({ error: "Unable to sign in right now." }, { status: 503 }); }
}
