import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ user: null, profile: null, staffRoles: [] }, { status: 200 });
  }

  const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, phone, avatar_url, country_code, account_status").eq("id", user.id).maybeSingle(),
    supabase.from("staff_roles").select("role").eq("user_id", user.id),
  ]);

  if (profileError || rolesError) {
    return NextResponse.json({ error: "Unable to load account information." }, { status: 500 });
  }

  if (profile?.account_status && profile.account_status !== "active") {
    await supabase.auth.signOut();
    return NextResponse.json({ error: "This account is not active." }, { status: 403 });
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    profile,
    staffRoles: (roles ?? []).map((row) => row.role),
  });
}
