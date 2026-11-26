"use client";

import AnalyticsMetric from "@/Components/AnalyticsMetric";
import DealerSidebar from "@/Components/DealerSidebar";
import ListingPerformanceChart from "@/Components/ListingPerformanceChart";
import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import { getSellerAnalytics } from "@/lib/clientFirebaseServices";
import type { SellerAnalytics } from "@/services/analyticsService";
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
  const [analytics, setAnalytics] = useState<SellerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    async function load() {
      if (!profile) return;
      try {
        setLoading(true);
        setLoadError("");
        setAnalytics(await getSellerAnalytics(profile.id));
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Analytics could not be loaded.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [profile]);

  const chartData = useMemo(
    () =>
      (analytics?.listings ?? []).slice(0, 6).map((listing) => ({
        name: [listing.make ?? "Vehicle", listing.model ?? ""].filter(Boolean).join(" ").slice(0, 12),
        views: listing.views,
        leads: listing.leadCount,
      })),
    [analytics],
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

          {loadError ? (
            <div role="alert" className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
              <p>{loadError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 rounded-full border border-red-300 px-4 py-2 font-semibold"
              >
                Retry
              </button>
            </div>
          ) : loading ? (
            <div className="flex min-h-80 items-center justify-center">
              <Loader2 className="animate-spin text-[#0B5D3B]" size={30} />
            </div>
          ) : (
            <>
              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AnalyticsMetric label="Views" value={analytics?.views ?? 0} />
                <AnalyticsMetric label="Leads" value={analytics?.leadCount ?? 0} />
                <AnalyticsMetric label="Favorites" value={analytics?.favorites ?? 0} />
                <AnalyticsMetric label="View to enquiry rate" value={Number(analytics?.conversionRate ?? 0).toFixed(1) + "%"} />
              </div>

              <div className="mt-8">
                {chartData.length ? (
                  <ListingPerformanceChart data={chartData} />
                ) : (
                  <p className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-600">
                    Listing performance will appear here after your inventory receives views or enquiries.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
