import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const paramsSchema = z.string().uuid();
const bodySchema = z.object({ status: z.enum(["draft", "pending_review", "paused", "archived"]) }).strict();

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!paramsSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid vehicle ID." }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Unsupported listing status." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to manage your listing." }, { status: 401 });
  }

  const { data: current, error: readError } = await supabase
    .from("vehicles").select("id, owner_id, status").eq("id", id).maybeSingle();
  if (readError) return NextResponse.json({ error: "Unable to load listing." }, { status: 500 });
  if (!current) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if (current.owner_id !== user.id) return NextResponse.json({ error: "You can only manage your own listing." }, { status: 403 });

  const { data, error } = await supabase.from("vehicles")
    .update({ status: parsed.data.status })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id, status, updated_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Unable to update listing status." }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Listing could not be updated." }, { status: 409 });
  return NextResponse.json({ data });
}
