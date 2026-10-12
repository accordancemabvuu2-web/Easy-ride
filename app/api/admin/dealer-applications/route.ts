import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to review dealer applications." }, { status: 401 });

  const { data: canReview, error: roleError } = await supabase.rpc("can_review_dealers");
  if (roleError || !canReview) return NextResponse.json({ error: "Verification permission is required." }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const status = params.get("status") ?? "pending";
  if (!["pending", "under_review", "approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid application status filter." }, { status: 400 });
  }
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(params.get("pageSize") ?? "20", 10) || 20));
  const from = (page - 1) * pageSize;

  const { data, error, count } = await supabase.from("dealer_applications")
    .select("id, user_id, business_name, registration_number, business_email, business_phone, website_url, country_code, business_address, description, document_paths, status, reviewer_id, review_notes, submitted_at, reviewed_at", { count: "exact" })
    .eq("status", status)
    .order("submitted_at", { ascending: true })
    .range(from, from + pageSize - 1);

  if (error) return NextResponse.json({ error: "Unable to load dealer applications." }, { status: 500 });
  return NextResponse.json({ data: data ?? [], page, pageSize, total: count ?? 0 });
}
