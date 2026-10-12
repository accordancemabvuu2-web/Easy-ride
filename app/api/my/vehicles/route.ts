import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const statusSchema = z.enum([
  "draft",
  "pending_review",
  "active",
  "paused",
  "sold",
  "archived",
  "rejected",
]);
const PAGE_SIZE_MAX = 48;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to view your listings." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const requestedStatus = params.get("status");
  if (requestedStatus && !statusSchema.safeParse(requestedStatus).success) {
    return NextResponse.json({ error: "Unsupported listing status." }, { status: 400 });
  }

  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, Number.parseInt(params.get("pageSize") ?? "24", 10) || 24));
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("vehicles")
    .select("*, vehicle_images(id, storage_path, alt_text, display_order)", { count: "exact" })
    .eq("owner_id", user.id);

  if (requestedStatus) query = query.eq("status", requestedStatus);

  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) {
    return NextResponse.json({ error: "Unable to load your listings." }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], page, pageSize, total: count ?? 0 });
}
