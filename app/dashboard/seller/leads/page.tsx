"use client";

import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import { Phone, MessageCircle, Loader2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SellerLeadsPage() {
  return (
    <RequireAuth>
      <RoleGuard allowedRoles={["seller", "dealer"]} label="Seller">
        <SellerLeadsContent />
      </RoleGuard>
    </RequireAuth>
  );
}

function SellerLeadsContent() {
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

  const leads: any[] = [];

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
            Seller workspace
          </p>
          <h1 className="mt-2 text-4xl font-bold">Your leads</h1>
          <p className="mt-3 text-gray-500">
            Track buyer inquiries and manage your leads from this dashboard.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <LeadStatCard
            icon={<MessageCircle className="text-blue-500" />}
            label="Total inquiries"
            value={leads.length}
          />
          <LeadStatCard
            icon={<Phone className="text-green-500" />}
            label="Active conversations"
            value={Math.ceil(leads.length * 0.6)}
          />
          <LeadStatCard
            icon={<TrendingUp className="text-purple-500" />}
            label="Conversion rate"
            value="0%"
          />
        </div>

        <div className="mt-8 rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center">
          <TrendingUp size={48} className="mx-auto text-gray-300" />
          <h2 className="mt-4 text-2xl font-bold">No leads yet</h2>
          <p className="mt-2 text-gray-500">
            Buyers will contact you when they're interested in your vehicles. Make sure your listings are active and complete.
          </p>

          <Link
            href="/dashboard/seller"
            className="mt-6 inline-flex rounded-full bg-[#0B5D3B] px-6 py-3 font-bold text-white"
          >
            View my listings
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function LeadStatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
        </div>
        <div className="text-5xl opacity-20">{icon}</div>
      </div>
    </div>
  );
}
