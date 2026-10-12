import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { updateVehicleSchema } from "@/lib/vehicles/update-validation";

const idSchema = z.string().uuid();

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid vehicle ID." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .select("*, vehicle_images(id, storage_path, alt_text, display_order), dealer_profiles(id, business_name, verified)")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Unable to load this vehicle." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Vehicle not found." }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid vehicle ID." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to edit a listing." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateVehicleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the listing details.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { data: current, error: currentError } = await supabase
    .from("vehicles")
    .select("id, owner_id, status, listing_type, sale_price, rent_day_price")
    .eq("id", id)
    .maybeSingle();

  if (currentError) return NextResponse.json({ error: "Unable to load this listing." }, { status: 500 });
  if (!current) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if (current.owner_id !== user.id) return NextResponse.json({ error: "You can only edit your own listings." }, { status: 403 });

  const nextType = parsed.data.listing_type ?? current.listing_type;
  const nextSalePrice = parsed.data.sale_price !== undefined ? parsed.data.sale_price : current.sale_price;
  const nextRentPrice = parsed.data.rent_day_price !== undefined ? parsed.data.rent_day_price : current.rent_day_price;
  if ((nextType === "sale" || nextType === "sale_and_rent") && nextSalePrice == null) {
    return NextResponse.json({ error: "A sale price is required for this listing type." }, { status: 400 });
  }
  if ((nextType === "rent" || nextType === "sale_and_rent") && nextRentPrice == null) {
    return NextResponse.json({ error: "A daily rental price is required for this listing type." }, { status: 400 });
  }

  const input = parsed.data;
  const updateData = {
    ...(input.listing_type !== undefined ? { listing_type: input.listing_type } : {}),
    ...(input.make !== undefined ? { make: input.make } : {}),
    ...(input.model !== undefined ? { model: input.model } : {}),
    ...(input.trim !== undefined ? { trim: input.trim || null } : {}),
    ...(input.year !== undefined ? { year: input.year } : {}),
    ...(input.mileage_km !== undefined ? { mileage_km: input.mileage_km ?? null } : {}),
    ...(input.condition !== undefined ? { condition: input.condition } : {}),
    ...(input.fuel_type !== undefined ? { fuel_type: input.fuel_type || null } : {}),
    ...(input.transmission !== undefined ? { transmission: input.transmission || null } : {}),
    ...(input.body_type !== undefined ? { body_type: input.body_type || null } : {}),
    ...(input.engine !== undefined ? { engine: input.engine || null } : {}),
    ...(input.drivetrain !== undefined ? { drivetrain: input.drivetrain || null } : {}),
    ...(input.seat_count !== undefined ? { seat_count: input.seat_count ?? null } : {}),
    ...(input.exterior_color !== undefined ? { exterior_color: input.exterior_color || null } : {}),
    ...(input.sale_price !== undefined ? { sale_price: input.sale_price ?? null } : {}),
    ...(input.rent_day_price !== undefined ? { rent_day_price: input.rent_day_price ?? null } : {}),
    ...(input.rent_week_price !== undefined ? { rent_week_price: input.rent_week_price ?? null } : {}),
    ...(input.rent_month_price !== undefined ? { rent_month_price: input.rent_month_price ?? null } : {}),
    ...(input.currency !== undefined ? { currency: input.currency.toUpperCase() } : {}),
    ...(input.country_code !== undefined ? { country_code: input.country_code || null } : {}),
    ...(input.city !== undefined ? { city: input.city || null } : {}),
    ...(input.address_label !== undefined ? { address_label: input.address_label || null } : {}),
    ...(input.latitude !== undefined ? { latitude: input.latitude ?? null } : {}),
    ...(input.longitude !== undefined ? { longitude: input.longitude ?? null } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
  };

  const { data, error } = await supabase.from("vehicles")
    .update(updateData)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id, status, updated_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Listing could not be updated." }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Listing not found or no longer editable." }, { status: 404 });
  return NextResponse.json({ data });
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid vehicle ID." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to remove a listing." }, { status: 401 });
  }

  const { data: current, error: currentError } = await supabase
    .from("vehicles").select("id, owner_id, status").eq("id", id).maybeSingle();
  if (currentError) return NextResponse.json({ error: "Unable to load this listing." }, { status: 500 });
  if (!current) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  if (current.owner_id !== user.id) return NextResponse.json({ error: "You can only remove your own listings." }, { status: 403 });
  if (!["draft", "rejected", "archived"].includes(current.status)) {
    return NextResponse.json({ error: "Only draft, rejected or archived listings can be deleted. Archive this listing first." }, { status: 409 });
  }

  const { error } = await supabase.from("vehicles").delete().eq("id", id).eq("owner_id", user.id);
  if (error) return NextResponse.json({ error: "Unable to remove this listing." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
