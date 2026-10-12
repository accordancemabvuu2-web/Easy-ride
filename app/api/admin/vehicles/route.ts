import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to review listings." }, { status: 401 });

  const { data: canReview, error: roleError } = await supabase.rpc("can_review_dealers");
  if (roleError || !canReview) return NextResponse.json({ error: "Verification permission is required." }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const status = params.get("status") ?? "pending_review";
  if (!["pending_review", "rejected", "draft"].includes(status)) {
    return NextResponse.json({ error: "Invalid moderation status filter." }, { status: 400 });
  }
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(params.get("pageSize") ?? "20", 10) || 20));
  const from = (page - 1) * pageSize;

  const { data, error, count } = await supabase.from("vehicles")
    .select("id, owner_id, dealer_id, listing_type, status, make, model, year, mileage_km, sale_price, rent_day_price, currency, country_code, city, description, created_at, vehicle_images(id, storage_path, alt_text, display_order)", { count: "exact" })
    .eq("status", status)
    .order("created_at", { ascending: true })
    .range(from, from + pageSize - 1);

  if (error) return NextResponse.json({ error: "Unable to load moderation queue." }, { status: 500 });
  return NextResponse.json({ data: data ?? [], page, pageSize, total: count ?? 0 });
}
