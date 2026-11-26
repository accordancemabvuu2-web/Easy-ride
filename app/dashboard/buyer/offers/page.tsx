"use client";

import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import { getUserOffers } from "@/lib/clientFirebaseServices";
import type { VehicleOffer } from "@/Types/offer";
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
  const [offers, setOffers] = useState<VehicleOffer[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    void getUserOffers(profile.id)
      .then((result) => {
        if (active) setOffers(result.filter((offer) => offer.buyerId === profile.id));
      })
      .catch((requestError: unknown) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Offers could not be loaded.");
      });
    return () => { active = false; };
  }, [profile]);

  const pending = offers.filter((offer) => offer.status === "pending").length;
  const accepted = offers.filter((offer) => offer.status === "accepted").length;
  const rejected = offers.filter((offer) => offer.status === "rejected").length;

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">Buyer workspace</p>
        <h1 className="mt-2 text-4xl font-bold">Your offers</h1>
        <p className="mt-3 text-gray-600">Current totals come from your backend offer records.</p>

        {error ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total offers" value={offers.length} />
          <StatCard label="Pending" value={pending} />
          <StatCard label="Accepted" value={accepted} />
          <StatCard label="Rejected" value={rejected} />
        </div>

        <div className="mt-8 rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-10 text-center">
          <p className="text-gray-600">{offers.length ? "Review seller responses to your offers." : "You have not made an offer yet."}</p>
          <Link href="/offers" className="mt-5 inline-flex rounded-full bg-[#0B5D3B] px-6 py-3 font-bold text-white">
            Open offers
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
