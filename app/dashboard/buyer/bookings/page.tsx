"use client";

import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { Calendar, CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function BuyerBookingsPage() {
  return (
    <RequireAuth>
      <RoleGuard allowedRoles={["buyer"]} label="Buyer">
        <BuyerBookingsContent />
      </RoleGuard>
    </RequireAuth>
  );
}

function BuyerBookingsContent() {
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
    active: 0,
    completed: 0,
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
            Buyer workspace
          </p>
          <h1 className="mt-2 text-4xl font-bold">Your bookings</h1>
          <p className="mt-3 text-gray-500">
            Track your rental bookings and upcoming reservations.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          <StatCard label="Total bookings" value={stats.total} color="blue" />
          <StatCard label="Pending" value={stats.pending} color="amber" />
          <StatCard label="Active" value={stats.active} color="green" />
          <StatCard label="Completed" value={stats.completed} color="purple" />
        </div>

        <div className="mt-8 rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center">
          <Calendar size={48} className="mx-auto text-gray-300" />
          <h2 className="mt-4 text-2xl font-bold">No bookings yet</h2>
          <p className="mt-2 text-gray-500">
            Browse rental vehicles and book your next ride.
          </p>

          <Link
            href="/?type=rent"
            className="mt-6 inline-flex rounded-full bg-[#0B5D3B] px-6 py-3 font-bold text-white"
          >
            Browse rentals
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
  color?: "blue" | "green" | "amber" | "red" | "purple";
}) {
  const colorMap = {
    blue: "border-blue-200 bg-blue-50",
    green: "border-green-200 bg-green-50",
    amber: "border-amber-200 bg-amber-50",
    red: "border-red-200 bg-red-50",
    purple: "border-purple-200 bg-purple-50",
  };

  return (
    <div className={`rounded-3xl border ${colorMap[color]} p-6`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
