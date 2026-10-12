import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid name, email and password (at least 8 characters)." }, { status: 400 });
  }

  const supabase = await createClient();
  const origin = request.nextUrl.origin;
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    // Avoid revealing whether an email address is already registered.
    return NextResponse.json({ error: "We couldn't complete registration. Check your details or try signing in." }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    confirmationRequired: !data.session,
    message: data.session ? "Your account has been created." : "Check your email to confirm your account.",
  }, { status: 201 });
}
