import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["SUPPORT", "VERIFICATION", "ADMIN", "SUPER_ADMIN"]),
  enabled: z.boolean(),
}).strict();

async function requireMasterAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { user: null, response: NextResponse.json({ error: "Sign in to continue." }, { status: 401 }) };

  const { data: isMaster, error } = await supabase.rpc("is_master_admin");
  if (error || !isMaster) return { user: null, response: NextResponse.json({ error: "Master Admin permission is required." }, { status: 403 }) };
  return { user, response: null };
}

export async function GET() {
  const supabase = await createClient();
  const gate = await requireMasterAdmin(supabase);
  if (gate.response) return gate.response;

  const { data, error } = await supabase.from("staff_roles")
    .select("user_id, role, granted_by, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Unable to load staff roles." }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const gate = await requireMasterAdmin(supabase);
  if (gate.response) return gate.response;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid account, staff role and enabled state." }, { status: 400 });

  const { data, error } = await supabase.rpc("manage_staff_role", {
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role,
    p_enabled: parsed.data.enabled,
  });
  if (error) {
    const forbidden = error.code === "42501";
    return NextResponse.json({ error: forbidden ? "Master Admin permission is required." : (error.message || "Unable to update staff role.") }, { status: forbidden ? 403 : 400 });
  }
  return NextResponse.json({ ok: Boolean(data), userId: parsed.data.userId, role: parsed.data.role, enabled: parsed.data.enabled });
}
