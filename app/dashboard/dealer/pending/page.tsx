"use client";

import DashboardShell from "@/Components/DashboardShell";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function PendingDealerDashboardPage() {
  return (
    <RequireAuth>
      <PendingDealerContent />
    </RequireAuth>
  );
}

function PendingDealerContent() {
  const { profile, loading, isAdmin, isDealer, isPendingDealer } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="animate-spin text-[#0B5D3B]" size={36} /></div>;
  }

  if (isAdmin || isDealer || !isPendingDealer) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-bold">This dashboard is not available for your account.</h1>
          <Link href="/dashboard" className="mt-4 inline-flex rounded-full bg-[#0B5D3B] px-5 py-3 font-bold text-white">Go to my dashboard</Link>
        </div>
      </div>
    );
  }

  const businessName = profile?.dealership?.businessName || "your dealership";
  const status = profile?.dealership?.verificationStatus || "pending";

  return (
    <DashboardShell role="personal">
      <section className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-amber-700"><ShieldCheck size={28} /></div>
          <p className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-amber-800">Dealership application</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Application under review</h1>
          <p className="mt-3 leading-7 text-slate-700">
            {businessName} has a current verification status of <strong>{status.replace("_", " ")}</strong>.
            Dealer inventory and analytics will become available after backend approval.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-4"><p className="text-xs font-bold uppercase text-gray-500">1. Submitted</p><p className="mt-1 text-sm font-semibold">Business details received</p></div>
            <div className="rounded-2xl bg-white p-4"><p className="text-xs font-bold uppercase text-gray-500">2. Review</p><p className="mt-1 text-sm font-semibold">Admin verification in progress</p></div>
            <div className="rounded-2xl bg-white p-4"><p className="text-xs font-bold uppercase text-gray-500">3. Next step</p><p className="mt-1 text-sm font-semibold">Return after approval</p></div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dealer/profile" className="rounded-full bg-[#0B5D3B] px-5 py-3 font-bold text-white">View application</Link>
            <Link href="/dashboard/buyer" className="rounded-full border border-slate-300 bg-white px-5 py-3 font-bold text-slate-700">Continue browsing</Link>
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
