"use client";

import AnalyticsMetric from "@/Components/AnalyticsMetric";
import DashboardShell from "@/Components/DashboardShell";
import ListingPerformanceChart from "@/Components/ListingPerformanceChart";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import { vehicles as demoVehicles } from "@/Data/vehicles";
import { getSellerAnalytics, type SellerAnalytics } from "@/services/analyticsService";
import { getMyListings } from "@/services/listingService";
import type { Vehicle } from "@/Types/vehicle";
import { ArrowRight, BarChart3, Download, Loader2, MessageCircle, Tag, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function DealerAnalyticsPage() {
  return (
    <RequireAuth>
      <RoleGuard allowedRoles={["seller", "dealer", "buyer"]} label="Seller">
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
        if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
          setListings(demoVehicles);
          setAnalytics({
            views: demoVehicles.reduce((sum, listing) => sum + listing.views, 0),
            contacts: 86,
            favorites: demoVehicles.reduce((sum, listing) => sum + listing.favoritesCount, 0),
            leadCount: 86,
            conversionRate: 8.4,
            favoriteRate: 6.9,
            listings: demoVehicles,
          });
          return;
        }
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
    <DashboardShell role="seller">
      <section className="mx-auto max-w-[1440px]">
        <div>
              <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-center gap-3"><BarChart3 className="text-[#0B5D3B]" />
            <div>
              <p className="text-sm font-semibold text-[#718179]">Seller studio / Analytics</p>
              <h1 className="text-4xl font-black">Analytics</h1><p className="mt-1 text-[#73827B]">Understand what is working, where buyers drop off, and what to do next.</p>
            </div>
          </div><button onClick={()=>{const rows=["Vehicle,Views,Enquiries",...listings.map((v)=>`${v.year} ${v.make} ${v.model},${v.views},${Math.max(1,Math.round(v.views*.015))}`)];const blob=new Blob([rows.join("\n")],{type:"text/csv"});const href=URL.createObjectURL(blob);const a=document.createElement("a");a.href=href;a.download="easyride-analytics.csv";a.click();URL.revokeObjectURL(href);}} className="inline-flex items-center gap-2 rounded-xl bg-[#07543D] px-4 py-3 text-sm font-bold text-white"><Download size={17}/>Export report</button></div>

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
              <div className="mt-6 grid gap-5 xl:grid-cols-[1.25fr_.75fr]"><section className="rounded-2xl border border-[#E5ECE8] bg-white p-5"><h2 className="text-xl font-black">Top-performing vehicles</h2><div className="mt-4 divide-y divide-[#EEF2EF]">{listings.slice(0,4).map((vehicle,index)=><div key={vehicle.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="font-bold">{vehicle.year} {vehicle.make} {vehicle.model}</p><p className="text-xs text-[#718179]">Stock #{String(1024+index)} · {vehicle.location.city}</p></div><div className="flex gap-6 text-sm"><span><b>{vehicle.views.toLocaleString()}</b><small className="block text-[#718179]">Views</small></span><span><b>{Math.max(1,Math.round(vehicle.views*.015))}</b><small className="block text-[#718179]">Enquiries</small></span><span><b>{(8+index*1.2).toFixed(1)}%</b><small className="block text-[#718179]">Conversion</small></span></div></div>)}</div><Link href="/dashboard/seller/inventory" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#07543D]">View all vehicles <ArrowRight size={16}/></Link></section><div className="space-y-5"><section className="rounded-2xl border border-[#E5ECE8] bg-white p-5"><h2 className="text-xl font-black">Buyer funnel</h2>{[["Views",12480,"100%"],["Enquiries",186,"1.5%"],["Test drives",42,"0.3%"],["Offers",9,"0.1%"],["Deals",4,"0.03%"]].map(([label,value,rate],i)=><div key={String(label)} className="mt-4 grid grid-cols-[80px_1fr_55px] items-center gap-3 text-sm"><span className="text-[#718179]">{label}</span><div className="h-3 rounded-full bg-[#EDF2EF]"><div className="h-3 rounded-full" style={{width:`${Math.max(Number(value)/12480*100,5)}%`,background:["#45B99A","#4D8DF5","#FFC94A","#A56AF5","#31B99A"][i]}}/></div><b>{rate}</b></div>)}</section><section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="flex items-center gap-2 font-black"><TriangleAlert size={19} className="text-amber-600"/>Recommended actions</h2><p className="mt-3 text-sm">Add two photos to your Toyota Axio listing to improve buyer confidence.</p><Link href="/dashboard/seller/inventory" className="mt-3 inline-flex rounded-lg bg-amber-300 px-3 py-2 text-sm font-bold">Improve listing</Link><p className="mt-4 flex items-center gap-2 border-t border-amber-200 pt-4 text-sm"><MessageCircle size={17}/>Reply to warm leads today</p><Link href="/dashboard/seller/leads" className="mt-2 inline-flex text-sm font-bold text-[#07543D]">Open leads <ArrowRight size={15}/></Link><p className="mt-3 flex items-center gap-2 text-sm"><Tag size={17}/>Pricing is competitive in your area</p></section></div></div>
            </>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}
