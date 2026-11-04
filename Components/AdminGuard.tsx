"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { user, profile, loading, isAdmin } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="animate-spin text-[#0B5D3B]" size={36} />
      </div>
    );
  }

  const activeUser = user || profile;
  const hasAccess = Boolean(activeUser && (isAdmin || activeUser.role === "admin"));

  if (!hasAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4">
        <section className="w-full max-w-lg rounded-3xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto text-red-600" size={48} />
          <h1 className="mt-5 text-3xl font-bold">Administrator access required</h1>
          <p className="mt-3 leading-7 text-gray-500">
            Your account does not possess the administrative privileges required to access the Easy Ride administration portal.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Return Home
            </Link>
            <Link
              href="/login?next=/admin"
              className="inline-flex items-center justify-center rounded-full bg-[#0B5D3B] px-6 py-3 font-bold text-white hover:bg-[#094c30]"
            >
              Sign In as Admin
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
