import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectMongo } from "@/lib/mongodb";
import { ProfileModel } from "@/models";
import { setSession } from "@/lib/auth";
const schema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254), password: z.string().min(8).max(128) });
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid name, email and password (at least 8 characters)." }, { status: 400 });
  try {
    await connectMongo();
    const email = parsed.data.email.toLowerCase();
    if (await ProfileModel.exists({ email })) return NextResponse.json({ error: "An account with this email already exists. Please sign in." }, { status: 409 });
    const user = await ProfileModel.create({ email, password_hash: await bcrypt.hash(parsed.data.password, 12), display_name: parsed.data.name, full_name: parsed.data.name, role: "buyer", email_verified: true });
    await setSession(String(user._id));
    return NextResponse.json({ ok: true, confirmationRequired: false, message: "Your account has been created.", user: { id: String(user._id), email } }, { status: 201 });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return NextResponse.json({ error: "An account with this email already exists. Please sign in." }, { status: 409 });
    console.error("Registration failed", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "We couldn't complete registration. Please try again." }, { status: 503 });
  }
}
