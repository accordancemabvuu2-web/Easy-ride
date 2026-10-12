import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({ vehicleId: z.string().uuid() });

async function signedInClient() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null };
  return { supabase, user };
}


export async function GET() {
  const { supabase, user } = await signedInClient();
  if (!user) return NextResponse.json({ error: "Sign in to view saved vehicles." }, { status: 401 });

  const { data, error } = await supabase
    .from("favorites")
    .select("vehicle_id, created_at, vehicles(id, owner_id, dealer_id, listing_type, status, make, model, year, mileage_km, sale_price, rent_day_price, currency, country_code, city, vehicle_images(id, storage_path, alt_text, display_order))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Unable to load saved vehicles." }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await signedInClient();
  if (!user) return NextResponse.json({ error: "Sign in to save vehicles." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid vehicle ID." }, { status: 400 });

  const { error } = await supabase.from("favorites").upsert(
    { user_id: user.id, vehicle_id: parsed.data.vehicleId },
    { onConflict: "user_id,vehicle_id", ignoreDuplicates: true }
  );
  if (error) return NextResponse.json({ error: "Unable to save this vehicle." }, { status: 400 });
  return NextResponse.json({ ok: true, saved: true });
}

export async function DELETE(request: NextRequest) {
  const { supabase, user } = await signedInClient();
  if (!user) return NextResponse.json({ error: "Sign in to manage saved vehicles." }, { status: 401 });

  const parsed = schema.safeParse({ vehicleId: request.nextUrl.searchParams.get("vehicleId") });
  if (!parsed.success) return NextResponse.json({ error: "Invalid vehicle ID." }, { status: 400 });

  const { error } = await supabase.from("favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("vehicle_id", parsed.data.vehicleId);
  if (error) return NextResponse.json({ error: "Unable to remove this vehicle." }, { status: 400 });
  return NextResponse.json({ ok: true, saved: false });
}
