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
  const { profile, loading, authUnavailable, refreshUser } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && !profile && !authUnavailable) {
      const next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [mounted, loading, profile, authUnavailable, router]);

  if (!mounted || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]" role="status" aria-label="Loading authentication">
        <Loader2 className="animate-spin text-[#0B5D3B]" size={36} />
      </div>
    );
  }

  if (!profile && authUnavailable) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4">
        <section className="max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Easy Ride is temporarily unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">We couldn’t verify your session because the service could not be reached. Your saved sign-in cookie has not been cleared.</p>
          <button type="button" onClick={() => void refreshUser()} className="mt-4 rounded-full bg-[#0B5D3B] px-5 py-2.5 text-sm font-bold text-white">Retry connection</button>
        </section>
      </main>
    );
  }

  if (!profile) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]" role="status" aria-label="Redirecting to sign in"><Loader2 className="animate-spin text-[#0B5D3B]" size={36} /></div>;
  }

  return <>{authUnavailable && <div role="status" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow-lg">The session service is temporarily unavailable. Your current account view is being kept. <button type="button" onClick={() => void refreshUser()} className="ml-2 font-bold underline">Retry</button></div>}{children}</>;
}
