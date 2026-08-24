"use client";

import AnalyticsMetric from "@/Components/AnalyticsMetric";
import DealerSidebar from "@/Components/DealerSidebar";
import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import { getSellerAnalytics, type SellerAnalytics } from "@/services/analyticsService";
import { getMyListings } from "@/services/listingService";
import type { Vehicle } from "@/Types/vehicle";
import { LayoutDashboard, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DealerDashboardPage() {
  return (
    <RequireAuth>
      <RoleGuard allowedRoles={["dealer"]} label="Dealer">
        <DealerDashboardContent />
      </RoleGuard>
    </RequireAuth>
  );
}

function DealerDashboardContent() {
  const { profile } = useAuth();
  const [listings, setListings] = useState<Vehicle[]>([]);
  const [analytics, setAnalytics] = useState<SellerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      try {
        setLoading(true);
        const [inventory, sellerAnalytics] = await Promise.all([
          getMyListings(profile.id),
          getSellerAnalytics(profile.id),
        ]);
        setListings(inventory);
        setAnalytics(sellerAnalytics);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [profile]);

  const active = listings.filter((listing) => listing.status === "active").length;
  const pending = listings.filter((listing) => listing.status === "pending").length;

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[280px_1fr] lg:px-6">
        <DealerSidebar />

        <div>
          <div className="flex items-center gap-3">
            <LayoutDashboard className="text-[#0B5D3B]" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
                Dealer dashboard
              </p>
              <h1 className="text-4xl font-bold">Your dealer workspace</h1>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-80 items-center justify-center">
              <Loader2 className="animate-spin text-[#0B5D3B]" size={30} />
            </div>
          ) : (
            <>
              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AnalyticsMetric label="Total inventory" value={listings.length} />
                <AnalyticsMetric label="Active listings" value={active} />
                <AnalyticsMetric label="Pending listings" value={pending} />
                <AnalyticsMetric label="Total views" value={analytics?.views ?? 0} />
                <AnalyticsMetric label="WhatsApp leads" value={analytics?.contacts ?? 0} />
                <AnalyticsMetric label="Favorites" value={analytics?.favorites ?? 0} />
                <AnalyticsMetric label="Conversion rate" value={`${Number(analytics?.conversionRate ?? 0).toFixed(1)}%`} />
                <AnalyticsMetric label="Lead count" value={analytics?.leadCount ?? 0} />
              </div>

              <div className="mt-8 rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold">Quick actions</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/dealer/inventory" className="rounded-full bg-[#0B5D3B] px-5 py-3 font-semibold text-white">
                    View inventory
                  </Link>
                  <Link href="/create-listing" className="rounded-full border border-[#E5E7EB] px-5 py-3 font-semibold">
                    Add vehicle
                  </Link>
                  <Link href="/dealer/analytics" className="rounded-full border border-[#E5E7EB] px-5 py-3 font-semibold">
                    View analytics
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
