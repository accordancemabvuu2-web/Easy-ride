import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const redirectPath = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  // Registration needs the browser client to own the session so the user can
  // continue setup on the registration screen.
  if (code && redirectPath === "/register") {
    const registrationUrl = new URL("/register", url.origin);
    registrationUrl.searchParams.set("code", code);
    registrationUrl.searchParams.set("verified", "1");
    return NextResponse.redirect(registrationUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
    }
  }

  return NextResponse.redirect(new URL(redirectPath, url.origin));
}
