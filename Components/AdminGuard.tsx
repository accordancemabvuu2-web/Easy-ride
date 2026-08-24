"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { firebaseUser, profile, loading, firebaseEnabled } = useAuth();
  const [claimUserId, setClaimUserId] = useState<string | null>(null);
  const [hasAdminClaim, setHasAdminClaim] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!firebaseEnabled || !firebaseUser) {
      return () => {
        cancelled = true;
      };
    }

    void firebaseUser
      .getIdTokenResult()
      .then((token) => {
        if (!cancelled) {
          setHasAdminClaim(token.claims.admin === true);
          setClaimUserId(firebaseUser.uid);
        }
      })

    return () => {
      cancelled = true;
    };
  }, [firebaseEnabled, firebaseUser]);

  const claimLoading = firebaseEnabled && Boolean(firebaseUser) && claimUserId !== firebaseUser?.uid;

  if (loading || claimLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="animate-spin text-[#0B5D3B]" size={36} />
      </div>
    );
  }

  const hasAccess =
    profile?.role === "admin" &&
    (firebaseEnabled ? Boolean(firebaseUser) && hasAdminClaim : true);

  if (!hasAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4">
        <section className="w-full max-w-lg rounded-3xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto text-red-600" size={48} />
          <h1 className="mt-5 text-3xl font-bold">Administrator access required</h1>
          <p className="mt-3 leading-7 text-gray-500">
            Your account does not have permission to access the Easy Ride administration portal.
          </p>
          <Link
            href="/"
            className="mt-7 inline-flex rounded-full bg-[#0B5D3B] px-6 py-3 font-bold text-white"
          >
            Return Home
          </Link>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
