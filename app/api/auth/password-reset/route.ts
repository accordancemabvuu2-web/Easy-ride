import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ email: z.string().trim().email().max(254) });

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const supabase = await createClient();
  const redirectTo = `${request.nextUrl.origin}/auth/callback?next=/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });

  // Avoid email enumeration; only report input/configuration errors in server logs.
  if (error) {
    return NextResponse.json({ error: "If this address can receive a reset link, one will be sent shortly." }, { status: 200 });
  }
  return NextResponse.json({ ok: true, message: "If this address can receive a reset link, one will be sent shortly." });
}
