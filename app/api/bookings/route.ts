import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const rentalSchema = z.object({
  vehicleId: z.string().uuid(),
  startDate: z.string().date(),
  endDate: z.string().date(),
}).refine((value) => value.endDate > value.startDate, {
  message: "Return date must be after pick-up date.",
  path: ["endDate"],
});

const bookingTypeSchema = z.enum(["rental", "purchase"]);
const bookingStatusSchema = z.enum(["pending", "confirmed", "completed", "cancelled", "declined", "expired"]);
const PAGE_SIZE_MAX = 48;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to view your bookings." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const role = params.get("role") ?? "all";
  if (!["all", "buyer", "seller"].includes(role)) {
    return NextResponse.json({ error: "Unsupported booking role filter." }, { status: 400 });
  }
  const type = params.get("type");
  if (type && !bookingTypeSchema.safeParse(type).success) {
    return NextResponse.json({ error: "Unsupported booking type." }, { status: 400 });
  }
  const status = params.get("status");
  if (status && !bookingStatusSchema.safeParse(status).success) {
    return NextResponse.json({ error: "Unsupported booking status." }, { status: 400 });
  }

  const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, Number.parseInt(params.get("pageSize") ?? "24", 10) || 24));
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("bookings")
    .select("id, vehicle_id, buyer_id, seller_id, booking_type, start_date, end_date, status, payment_status, currency, subtotal, service_fee, total_amount, expires_at, confirmed_at, completed_at, cancelled_at, created_at, vehicles(id, make, model, year, city, country_code, vehicle_images(storage_path, display_order))", { count: "exact" });

  if (role === "buyer") query = query.eq("buyer_id", user.id);
  else if (role === "seller") query = query.eq("seller_id", user.id);
  else query = query.or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
  if (type) query = query.eq("booking_type", type);
  if (status) query = query.eq("status", status);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) return NextResponse.json({ error: "Unable to load bookings." }, { status: 500 });
  return NextResponse.json({ data: data ?? [], page, pageSize, total: count ?? 0 });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Sign in before booking a vehicle." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = rentalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose valid vehicle and rental dates.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { vehicleId, startDate, endDate } = parsed.data;
  const { data, error } = await supabase.rpc("create_rental_booking", {
    p_vehicle_id: vehicleId,
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (error) {
    const conflict = error.code === "23P01";
    return NextResponse.json(
      { error: conflict ? "Those dates are no longer available. Please choose another range." : (error.message || "Unable to create booking.") },
      { status: conflict ? 409 : 400 }
    );
  }

  return NextResponse.json({ bookingId: data, status: "pending", paymentStatus: "unpaid" }, { status: 201 });
}
