"use client";

import RequireAuth from "@/Components/RequireAuth";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LegacyDealerDashboardPage() {
  return (
    <RequireAuth>
      <DealerRedirect />
    </RequireAuth>
  );
}

function DealerRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/dealer");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]" role="status">
      <Loader2 className="animate-spin text-[#0B5D3B]" size={36} />
    </div>
  );
}
