"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

interface RequireAuthProps {
  children: ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && !profile) {
      const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [mounted, loading, profile, router]);

  if (!mounted || loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]" role="status" aria-label="Loading authentication">
        <Loader2 className="animate-spin text-[#0B5D3B]" size={36} />
      </div>
    );
  }

  return <>{children}</>;
}
