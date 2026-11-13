"use client";

import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
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
  const { profile, loading, isAdmin, isDealer, isSeller } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !profile) return;

    if (isAdmin) {
      router.replace("/admin");
    } else if (isDealer) {
      router.replace("/dashboard/dealer");
    } else if (isSeller) {
      router.replace("/dashboard/seller");
    } else {
      router.replace("/dashboard/buyer");
    }
  }, [loading, profile, isAdmin, isDealer, isSeller, router]);

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
