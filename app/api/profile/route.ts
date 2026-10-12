import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const updateSchema = z.object({
  display_name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  avatar_url: z.string().trim().url().max(1000).optional().or(z.literal("")),
  country_code: z.string().trim().max(3).optional().or(z.literal("")),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "Provide at least one field to update.",
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to view your profile." }, { status: 401 });

  const { data, error } = await supabase.from("profiles")
    .select("id, display_name, phone, avatar_url, country_code, account_status, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Unable to load your profile." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  if (data.account_status !== "active") return NextResponse.json({ error: "This account is not active." }, { status: 403 });
  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please check the profile details.", details: parsed.error.flatten() }, { status: 400 });

  const updateData = {
    ...(parsed.data.display_name !== undefined ? { display_name: parsed.data.display_name } : {}),
    ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone || null } : {}),
    ...(parsed.data.avatar_url !== undefined ? { avatar_url: parsed.data.avatar_url || null } : {}),
    ...(parsed.data.country_code !== undefined ? { country_code: parsed.data.country_code || null } : {}),
  };

  const { data, error } = await supabase.from("profiles").update(updateData)
    .eq("id", user.id)
    .select("id, display_name, phone, avatar_url, country_code, account_status, updated_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Unable to update your profile." }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  return NextResponse.json({ data });
}
