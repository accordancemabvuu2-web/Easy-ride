"use client";

import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { getDashboardDestination } from "@/lib/authNavigation";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardRoleRedirect />
    </RequireAuth>
  );
}

function DashboardRoleRedirect() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !profile) return;

    const destination = getDashboardDestination(profile);
    if (process.env.NODE_ENV !== "production") {
      console.log("[AuthDiagnostic] DashboardClient redirecting to role dashboard", {
        destination,
        role: profile.role,
        accountType: profile.accountType,
      });
    }

    router.replace(destination);
  }, [loading, profile, router]);

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-[#F8F9FA] text-[#202124]"
      role="status"
      aria-label="Directing to your dashboard"
    >
      <Loader2 className="animate-spin text-[#0B5D3B]" size={36} />
      <p className="mt-4 text-sm font-semibold text-gray-600">
        Directing to your Easy Ride workspace...
      </p>
    </main>
  );
}
