import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Invalid booking ID." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to view this booking." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("id, vehicle_id, buyer_id, seller_id, booking_type, start_date, end_date, status, payment_status, currency, subtotal, service_fee, total_amount, expires_at, created_at, vehicles(id, make, model, year, city, country_code, vehicle_images(storage_path, display_order))")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Unable to load booking." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Booking not found or you don't have access." }, { status: 404 });
  return NextResponse.json({ data });
}
