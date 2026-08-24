"use client";

import AnalyticsMetric from "@/Components/AnalyticsMetric";
import DealerSidebar from "@/Components/DealerSidebar";
import ListingPerformanceChart from "@/Components/ListingPerformanceChart";
import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import { getSellerAnalytics, type SellerAnalytics } from "@/services/analyticsService";
import { getMyListings } from "@/services/listingService";
import type { Vehicle } from "@/Types/vehicle";
import { BarChart3, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function DealerAnalyticsPage() {
  return (
    <RequireAuth>
      <RoleGuard allowedRoles={["dealer"]} label="Dealer">
        <DealerAnalyticsContent />
      </RoleGuard>
    </RequireAuth>
  );
}

function DealerAnalyticsContent() {
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

  const chartData = useMemo(
    () =>
      listings.slice(0, 6).map((listing) => ({
        name: `${listing.make} ${listing.model}`.slice(0, 12),
        views: listing.views ?? 0,
        leads: 0,
      })),
    [listings],
  );

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[280px_1fr] lg:px-6">
        <DealerSidebar />
        <div>
          <div className="flex items-center gap-3">
            <BarChart3 className="text-[#0B5D3B]" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
                Analytics
              </p>
              <h1 className="text-4xl font-bold">Seller and dealer performance</h1>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-80 items-center justify-center">
              <Loader2 className="animate-spin text-[#0B5D3B]" size={30} />
            </div>
          ) : (
            <>
              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AnalyticsMetric label="Views" value={analytics?.views ?? 0} />
                <AnalyticsMetric label="Leads" value={analytics?.leadCount ?? 0} />
                <AnalyticsMetric label="Favorites" value={analytics?.favorites ?? 0} />
                <AnalyticsMetric label="Conversion rate" value={`${Number(analytics?.conversionRate ?? 0).toFixed(1)}%`} />
              </div>

              <div className="mt-8">
                <ListingPerformanceChart data={chartData} />
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
