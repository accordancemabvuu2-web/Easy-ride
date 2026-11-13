"use client";

import AnalyticsMetric from "@/Components/AnalyticsMetric";
import DashboardShell from "@/Components/DashboardShell";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import { getSellerAnalytics, type SellerAnalytics } from "@/services/analyticsService";
import { getMyListings } from "@/services/listingService";
import type { Vehicle } from "@/Types/vehicle";
import {
  BarChart3,
  CarFront,
  Loader2,
  Plus,
  Store,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DealerDashboardPage() {
  return (
    <RequireAuth>
      <RoleGuard allowedRoles={["dealer", "admin"]} label="Dealer">
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

  if (loading) {
    return (
      <DashboardShell role="dealer">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="animate-spin text-[#08784D]" size={36} />
        </div>
      </DashboardShell>
    );
  }

  const dealershipName = profile?.dealership?.businessName || profile?.name || "Dealership";

  return (
    <DashboardShell role="dealer">
      <section>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[#E7B319]/20 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#063F2C]">
                Verified Dealership
              </span>
            </div>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#17201D] sm:text-4xl">
              {dealershipName} Workspace
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your commercial vehicle inventory, lead conversions, and customer enquiries.
            </p>
          </div>
          <Link
            href="/create-listing"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E7B319] px-6 py-3 font-bold text-[#063F2C] shadow-sm hover:bg-[#d6a516]"
          >
            <Plus size={18} /> Add Vehicle
          </Link>
        </div>

        {/* Analytics & KPI Overview */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AnalyticsMetric label="Total Inventory" value={listings.length} />
          <AnalyticsMetric label="Active Vehicles" value={active} />
          <AnalyticsMetric label="Pending Review" value={pending} />
          <AnalyticsMetric label="Total Views" value={analytics?.views ?? 0} />
          <AnalyticsMetric label="Customer Leads" value={analytics?.leadCount ?? 0} />
          <AnalyticsMetric label="WhatsApp Inquiries" value={analytics?.contacts ?? 0} />
          <AnalyticsMetric label="Saved Favorites" value={analytics?.favorites ?? 0} />
          <AnalyticsMetric
            label="Conversion Rate"
            value={`${Number(analytics?.conversionRate ?? 0).toFixed(1)}%`}
          />
        </div>

        {/* Quick Actions Panel */}
        <div className="mt-8 rounded-3xl border border-[#DCE5DF] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-[#17201D]">Dealership Management</h2>
          <p className="mt-1 text-xs text-gray-500">
            Fast access to your inventory, performance insights, and organization profile.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/dealer/inventory"
              className="flex items-center gap-3 rounded-2xl border border-[#DCE5DF] bg-[#F8FAF9] p-4 font-semibold text-[#063F2C] transition hover:border-[#08784D] hover:bg-white"
            >
              <div className="rounded-xl bg-[#08784D]/10 p-2.5 text-[#08784D]">
                <CarFront size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">Manage Inventory</p>
                <p className="text-xs text-gray-500">{listings.length} vehicles</p>
              </div>
            </Link>

            <Link
              href="/create-listing"
              className="flex items-center gap-3 rounded-2xl border border-[#DCE5DF] bg-[#F8FAF9] p-4 font-semibold text-[#063F2C] transition hover:border-[#08784D] hover:bg-white"
            >
              <div className="rounded-xl bg-[#E7B319]/20 p-2.5 text-[#8A6B0A]">
                <Plus size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">Add Vehicle</p>
                <p className="text-xs text-gray-500">New listing</p>
              </div>
            </Link>

            <Link
              href="/dealer/analytics"
              className="flex items-center gap-3 rounded-2xl border border-[#DCE5DF] bg-[#F8FAF9] p-4 font-semibold text-[#063F2C] transition hover:border-[#08784D] hover:bg-white"
            >
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                <BarChart3 size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">View Analytics</p>
                <p className="text-xs text-gray-500">Insights & leads</p>
              </div>
            </Link>

            <Link
              href="/dealer/profile"
              className="flex items-center gap-3 rounded-2xl border border-[#DCE5DF] bg-[#F8FAF9] p-4 font-semibold text-[#063F2C] transition hover:border-[#08784D] hover:bg-white"
            >
              <div className="rounded-xl bg-purple-50 p-2.5 text-purple-700">
                <Store size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">Dealership Profile</p>
                <p className="text-xs text-gray-500">Contact & branding</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Empty state / Inventory highlights */}
        {listings.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-[#DCE5DF] bg-white p-12 text-center">
            <CarFront size={42} className="mx-auto text-gray-300" />
            <h3 className="mt-4 text-lg font-bold text-gray-800">No vehicles in inventory</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by uploading your first vehicle to the dealership showroom.
            </p>
            <Link
              href="/create-listing"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#08784D] px-6 py-3 text-sm font-bold text-white hover:bg-[#065A3A]"
            >
              <Plus size={16} /> Add Your First Listing
            </Link>
          </div>
        ) : null}
      </section>
    </DashboardShell>
  );
}
