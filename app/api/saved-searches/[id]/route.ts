import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const updateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  criteria: z.record(z.string(), z.unknown()).optional(),
  alert_email: z.boolean().optional(),
  alert_sms: z.boolean().optional(),
  alert_whatsapp: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "Provide at least one field to update.",
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "Invalid saved-search ID." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to edit saved searches." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Please check the saved search details.", details: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await supabase.from("saved_searches").update(parsed.data)
    .eq("id", id).eq("user_id", user.id)
    .select("id, name, criteria, alert_email, alert_sms, alert_whatsapp, updated_at")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to update saved search." }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Saved search not found." }, { status: 404 });
  return NextResponse.json({ data });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "Invalid saved-search ID." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to delete saved searches." }, { status: 401 });

  const { data, error } = await supabase.from("saved_searches").delete()
    .eq("id", id).eq("user_id", user.id).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Unable to delete saved search." }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Saved search not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
