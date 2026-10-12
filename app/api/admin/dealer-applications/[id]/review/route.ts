import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const paramsSchema = z.string().uuid();
const bodySchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reviewNotes: z.string().trim().max(5000).optional(),
}).strict();

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!paramsSchema.safeParse(id).success) return NextResponse.json({ error: "Invalid application ID." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to review dealer applications." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid review decision." }, { status: 400 });

  const { data, error } = await supabase.rpc("review_dealer_application", {
    p_application_id: id,
    p_decision: parsed.data.decision,
    p_review_notes: parsed.data.reviewNotes ?? null,
  });

  if (error) {
    const forbidden = error.code === "42501";
    return NextResponse.json({ error: forbidden ? "You do not have permission to review dealer applications." : "Unable to review this application." }, { status: forbidden ? 403 : 400 });
  }
  return NextResponse.json({ ok: true, applicationId: data, status: parsed.data.decision });
}
