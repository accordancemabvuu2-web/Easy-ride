"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldAlert, Sparkles, Store } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { UserRole } from "@/Types/user";
import toast from "react-hot-toast";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  label: string;
}

export default function RoleGuard({ children, allowedRoles, label }: RoleGuardProps) {
  const { profile, loading, activateSeller, isBuyer, isSeller, isDealer, isAdmin } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]" role="status" aria-label="Checking permissions">
        <Loader2 className="animate-spin text-[#0B5D3B]" size={36} />
      </div>
    );
  }

  // Check role or capability matching
  const hasAccess =
    allowedRoles.includes(profile.role) ||
    (allowedRoles.includes("buyer") && isBuyer) ||
    (allowedRoles.includes("seller") && isSeller) ||
    (allowedRoles.includes("dealer") && isDealer) ||
    (allowedRoles.includes("admin") && isAdmin);

  if (!hasAccess) {
    const isSellerUpgrade = allowedRoles.includes("seller") && !isSeller;
    const isDealerUpgrade = allowedRoles.includes("dealer") && !isDealer;

    const handleActivateSeller = async () => {
      try {
        setActivating(true);
        await activateSeller();
        toast.success("Seller account activated! Welcome to your seller dashboard.");
      } catch (err: unknown) {
        const error = err as { message?: string };
        toast.error(error.message || "Failed to activate seller capability.");
      } finally {
        setActivating(false);
      }
    };

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-4 py-12">
        <section className="w-full max-w-lg rounded-3xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            <ShieldAlert size={36} />
          </div>
          <h1 className="mt-5 text-2xl font-black text-slate-900 sm:text-3xl">{label} access required</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            Your current account role (<strong>{profile.role}</strong>) does not have access to this workspace.
          </p>

          {isSellerUpgrade && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-left">
              <div className="flex items-center gap-2 font-bold text-[#0B5D3B]">
                <Store size={18} /> Want to sell on Easy Ride?
              </div>
              <p className="mt-1 text-xs text-gray-600">
                You can activate selling capabilities on your existing account with one click.
              </p>
              <button
                type="button"
                onClick={handleActivateSeller}
                disabled={activating}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B5D3B] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#084B30] disabled:opacity-60"
              >
                {activating ? (
                  <>
                    <Loader2 className="animate-spin" size={14} /> Activating...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} /> Activate Seller Capabilities
                  </>
                )}
              </button>
            </div>
          )}

          {isDealerUpgrade && (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-left">
              <p className="text-xs font-bold text-blue-900">Are you a registered dealership?</p>
              <p className="mt-1 text-xs text-gray-600">
                Apply for dealership verification to manage multi-vehicle inventory and access analytics.
              </p>
              <Link
                href="/dealer/apply"
                className="mt-3 block text-center rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800"
              >
                Apply for Dealership
              </Link>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-full bg-[#0B5D3B] px-6 py-3 font-bold text-white hover:bg-[#094c30]"
            >
              Go to My Dashboard
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Return Home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
