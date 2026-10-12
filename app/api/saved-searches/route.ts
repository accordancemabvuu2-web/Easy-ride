import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  criteria: z.record(z.string(), z.unknown()).default({}),
  alert_email: z.boolean().default(true),
  alert_sms: z.boolean().default(false),
  alert_whatsapp: z.boolean().default(false),
}).strict();

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to view saved searches." }, { status: 401 });

  const { data, error } = await supabase.from("saved_searches")
    .select("id, name, criteria, alert_email, alert_sms, alert_whatsapp, last_notified_at, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Unable to load saved searches." }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to save a search." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please check the saved search details.", details: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase.from("saved_searches").insert({ user_id: user.id, ...parsed.data })
    .select("id, name, criteria, alert_email, alert_sms, alert_whatsapp, created_at")
    .single();
  if (error) return NextResponse.json({ error: "Unable to save this search." }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
