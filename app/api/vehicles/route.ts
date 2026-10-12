import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createVehicleSchema } from "@/lib/vehicles/validation";

const PAGE_SIZE_MAX = 48;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const params = request.nextUrl.searchParams;
  const query = (params.get("q") ?? "").trim().slice(0, 100);
  const mode = params.get("mode");
  const make = params.get("make");
  const city = params.get("city");
  const sort = params.get("sort") ?? "newest";
  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, Number.parseInt(params.get("pageSize") ?? "24", 10) || 24));

  let dbQuery = supabase
    .from("vehicles")
    .select("*, vehicle_images(id, storage_path, alt_text, display_order)", { count: "exact" })
    .eq("status", "active");

  if (mode === "buy") dbQuery = dbQuery.in("listing_type", ["sale", "sale_and_rent"]);
  if (mode === "rent") dbQuery = dbQuery.in("listing_type", ["rent", "sale_and_rent"]);
  if (make) dbQuery = dbQuery.ilike("make", make.slice(0, 80));
  if (city) dbQuery = dbQuery.ilike("city", `%${city.slice(0, 80)}%`);
  if (query) {
    const safeQuery = query.replace(/[^a-zA-Z0-9\s-]/g, " ").trim().slice(0, 80);
    dbQuery = dbQuery.or(`make.ilike.%${safeQuery}%,model.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`);
  }

  const priceColumn = mode === "rent" ? "rent_day_price" : "sale_price";
  if (sort === "price_asc") dbQuery = dbQuery.order(priceColumn, { ascending: true, nullsFirst: false });
  else if (sort === "price_desc") dbQuery = dbQuery.order(priceColumn, { ascending: false, nullsFirst: false });
  else dbQuery = dbQuery.order("published_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });

  const from = (page - 1) * pageSize;
  const { data, error, count } = await dbQuery.range(from, from + pageSize - 1);

  if (error) {
    return NextResponse.json({ error: "Unable to load vehicles." }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], page, pageSize, total: count ?? 0 });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Sign in to create a listing." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createVehicleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the listing details.", details: parsed.error.flatten() }, { status: 400 });
  }

  const input = parsed.data;
  const insertData = {
    owner_id: user.id,
    dealer_id: input.dealer_id || null,
    listing_type: input.listing_type,
    status: "pending_review" as const,
    make: input.make,
    model: input.model,
    trim: input.trim || null,
    year: input.year,
    mileage_km: input.mileage_km ?? null,
    condition: input.condition,
    fuel_type: input.fuel_type || null,
    transmission: input.transmission || null,
    body_type: input.body_type || null,
    engine: input.engine || null,
    drivetrain: input.drivetrain || null,
    seat_count: input.seat_count ?? null,
    exterior_color: input.exterior_color || null,
    sale_price: input.sale_price ?? null,
    rent_day_price: input.rent_day_price ?? null,
    rent_week_price: input.rent_week_price ?? null,
    rent_month_price: input.rent_month_price ?? null,
    currency: input.currency.toUpperCase(),
    country_code: input.country_code || null,
    city: input.city || null,
    address_label: input.address_label || null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    description: input.description,
  };

  const { data, error } = await supabase.from("vehicles").insert(insertData).select("id, status").single();
  if (error) {
    return NextResponse.json({ error: "Listing could not be saved. Check your account and listing details." }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
