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
import { ArrowUpRight, BarChart3, CarFront, LayoutDashboard, Loader2, Plus } from "lucide-react";
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
    <main className="min-h-screen bg-[#F4F7F3] text-[#17251E]">
      <Navbar />
      <section className="mx-auto grid max-w-[1440px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8">
        <DealerSidebar />

        <div>
          <div className="flex items-center gap-3">
            <LayoutDashboard className="text-[#0B5D3B]" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A6814]">Workspace / Overview</p>
              <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-[#17251E]">Your dealer workspace</h1>
            </div>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52665B]">A clear view of your inventory, performance and the next steps for your dealership.</p>

          {loading ? (
            <div className="flex min-h-80 items-center justify-center">
              <Loader2 className="animate-spin text-[#0B5D3B]" size={30} />
            </div>
          ) : (
            <>
              <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <AnalyticsMetric label="Total inventory" value={listings.length} />
                <AnalyticsMetric label="Active listings" value={active} />
                <AnalyticsMetric label="Pending listings" value={pending} />
                <AnalyticsMetric label="Total views" value={analytics?.views ?? 0} />
                <AnalyticsMetric label="WhatsApp leads" value={analytics?.contacts ?? 0} />
                <AnalyticsMetric label="Favorites" value={analytics?.favorites ?? 0} />
                <AnalyticsMetric label="Conversion rate" value={`${Number(analytics?.conversionRate ?? 0).toFixed(1)}%`} />
                <AnalyticsMetric label="Lead count" value={analytics?.leadCount ?? 0} />
              </div>

              <section className="mt-6 overflow-hidden rounded-xl border border-[#CEDBD0] bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#CEDBD0] px-5 py-4 sm:px-6"><div><h2 className="text-lg font-bold">Your inventory</h2><p className="mt-1 text-sm text-[#52665B]">Review vehicle status and keep your listings current.</p></div><Link href="/dealer/inventory" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 font-bold text-[#0B5D3B] hover:bg-[#EAF0E9]">Manage inventory <ArrowUpRight size={16} /></Link></div>
                {listings.length === 0 ? <div className="flex min-h-52 flex-col items-center justify-center px-6 py-9 text-center"><span className="grid h-12 w-12 place-items-center rounded-xl bg-[#EAF0E9] text-[#0B5D3B]"><CarFront size={23} /></span><h3 className="mt-4 font-bold">No vehicles in your inventory yet</h3><p className="mt-1 max-w-md text-sm leading-6 text-[#52665B]">Add your first vehicle to start reaching buyers and renters on Easy Ride.</p><Link href="/create-listing" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0B5D3B] px-4 font-bold text-white hover:bg-[#084B30]"><Plus size={17} /> Add a vehicle</Link></div> : <div className="divide-y divide-[#EAF0E9]">{listings.slice(0, 5).map((listing) => <div key={listing.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6"><div><p className="font-bold">{listing.make} {listing.model} {listing.year}</p><p className="mt-1 text-sm text-[#52665B]">{listing.location?.city ?? "Zimbabwe"} • {listing.listingType === "buy" ? "For sale" : "For rent"}</p></div><span className="rounded-full bg-[#EAF0E9] px-3 py-1 text-xs font-bold capitalize text-[#0B5D3B]">{listing.status}</span></div>)}</div>}
              </section>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div className="rounded-xl border border-[#CEDBD0] bg-white p-5 sm:p-6">
                <div className="flex items-center gap-2"><BarChart3 size={18} className="text-[#0B5D3B]" /><h2 className="text-lg font-bold">Performance</h2></div>
                <p className="mt-1 text-sm text-[#52665B]">Your latest listing activity.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/dealer/analytics" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0B5D3B] px-4 font-bold text-white hover:bg-[#084B30]">
                    View analytics <ArrowUpRight size={16} />
                  </Link>
                </div>
              </div>
              <div className="rounded-xl border border-[#CEDBD0] bg-white p-5 sm:p-6"><h2 className="text-lg font-bold">Dealer tools</h2><p className="mt-1 text-sm text-[#52665B]">Keep your business profile complete and trusted.</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/dealer/profile" className="rounded-lg border border-[#CEDBD0] px-4 py-2.5 text-sm font-semibold hover:bg-[#F4F7F3]">Business profile</Link><Link href="/verification" className="rounded-lg border border-[#CEDBD0] px-4 py-2.5 text-sm font-semibold hover:bg-[#F4F7F3]">Verification</Link></div></div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
