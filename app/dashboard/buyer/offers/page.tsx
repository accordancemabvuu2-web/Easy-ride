"use client";

import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import { AlertCircle, CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function BuyerOffersPage() {
  return (
    <RequireAuth>
      <RoleGuard allowedRoles={["buyer"]} label="Buyer">
        <BuyerOffersContent />
      </RoleGuard>
    </RequireAuth>
  );
}

function BuyerOffersContent() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
        </div>
        <Footer />
      </main>
    );
  }

  const stats = {
    total: 0,
    pending: 0,
    accepted: 0,
    rejected: 0,
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
            Buyer workspace
          </p>
          <h1 className="mt-2 text-4xl font-bold">Your offers</h1>
          <p className="mt-3 text-gray-500">
            Track all offers you've made and monitor seller responses.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          <StatCard label="Total offers" value={stats.total} color="blue" />
          <StatCard label="Pending" value={stats.pending} color="amber" />
          <StatCard label="Accepted" value={stats.accepted} color="green" />
          <StatCard label="Rejected" value={stats.rejected} color="red" />
        </div>

        <div className="mt-8 rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center">
          <h2 className="text-2xl font-bold">No offers yet</h2>
          <p className="mt-2 text-gray-500">
            Make an offer on a vehicle to start negotiating with sellers.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-full bg-[#0B5D3B] px-6 py-3 font-bold text-white"
          >
            Browse vehicles
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function StatCard({
  label,
  value,
  color = "blue",
}: {
  label: string;
  value: number;
  color?: "blue" | "green" | "amber" | "red";
}) {
  const colorMap = {
    blue: "border-blue-200 bg-blue-50",
    green: "border-green-200 bg-green-50",
    amber: "border-amber-200 bg-amber-50",
    red: "border-red-200 bg-red-50",
  };

  return (
    <div className={`rounded-3xl border ${colorMap[color]} p-6`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
