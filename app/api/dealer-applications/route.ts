import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  business_name: z.string().trim().min(2).max(160),
  registration_number: z.string().trim().max(100).optional().or(z.literal("")),
  business_email: z.string().trim().email().max(254).optional().or(z.literal("")),
  business_phone: z.string().trim().max(40).optional().or(z.literal("")),
  website_url: z.string().trim().url().max(400).optional().or(z.literal("")),
  country_code: z.string().trim().max(3).optional().or(z.literal("")),
  business_address: z.string().trim().max(500).optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  document_paths: z.array(z.string().trim().min(1).max(500)).max(10).default([]),
}).strict();

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Sign in to view dealer applications." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("dealer_applications")
    .select("id, business_name, status, submitted_at, reviewed_at, review_notes")
    .eq("user_id", user.id)
    .order("submitted_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Unable to load dealer applications." }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Sign in before applying to become a dealer." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the business details.", details: parsed.error.flatten() }, { status: 400 });
  }

  // Documents must use the applicant's private Storage folder. The Storage policies
  // independently enforce ownership; this check avoids persisting arbitrary paths.
  const validPaths = parsed.data.document_paths.every((path) =>
    path.startsWith(`${user.id}/`) && !path.split("/").includes("..")
  );
  if (!validPaths) {
    return NextResponse.json({ error: "Invalid document path." }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabase
    .from("dealer_applications")
    .select("id, status")
    .eq("user_id", user.id)
    .in("status", ["pending", "under_review"])
    .limit(1)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: "Unable to check existing applications." }, { status: 500 });
  if (existing) return NextResponse.json({ error: "You already have an application under review." }, { status: 409 });

  const input = parsed.data;
  const { data, error } = await supabase.from("dealer_applications").insert({
    user_id: user.id,
    business_name: input.business_name,
    registration_number: input.registration_number || null,
    business_email: input.business_email || null,
    business_phone: input.business_phone || null,
    website_url: input.website_url || null,
    country_code: input.country_code || null,
    business_address: input.business_address || null,
    description: input.description || null,
    document_paths: input.document_paths,
    status: "pending",
  }).select("id, status, submitted_at").single();

  if (error) return NextResponse.json({ error: "Unable to submit your dealer application." }, { status: 400 });
  return NextResponse.json({ data }, { status: 201 });
}
