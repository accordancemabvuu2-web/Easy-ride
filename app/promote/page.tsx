"use client";

import DashboardShell from "@/Components/DashboardShell";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import { getMyListings } from "@/services/listingService";
import type { Vehicle } from "@/Types/vehicle";
import { Loader2, Megaphone } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function PromotePage() {
  return <RequireAuth><RoleGuard allowedRoles={["buyer", "seller", "dealer"]} label="Seller"><PromoteContent /></RoleGuard></RequireAuth>;
}

function PromoteContent() {
  const { profile } = useAuth();
  const [listings, setListings] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    getMyListings(profile.id).then(setListings).finally(() => setLoading(false));
  }, [profile]);

  return <DashboardShell role="seller"><section><p className="text-sm font-bold uppercase tracking-[0.16em] text-[#C9A227]">Growth tools</p><h1 className="mt-2 text-3xl font-black">Promote your listings</h1><p className="mt-2 text-gray-500">Give your best vehicles more visibility in the marketplace.</p>{loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-[#08784D]" /></div> : <div className="mt-8 grid gap-4 md:grid-cols-2">{listings.filter((listing) => listing.status === "active").map((listing) => <article key={listing.id} className="rounded-2xl border border-[#DCE5DF] bg-white p-5 shadow-sm"><div className="flex items-start gap-3"><div className="rounded-xl bg-[#E7B319]/20 p-3 text-[#8A6B00]"><Megaphone size={20} /></div><div><h2 className="font-black">{listing.make} {listing.model} {listing.year}</h2><p className="mt-1 text-sm text-gray-500">{listing.views ?? 0} views · {listing.location.city}</p></div></div><Link href={`/promote/${listing.id}`} className="mt-5 inline-flex rounded-full bg-[#063F2C] px-4 py-2 text-sm font-bold text-white">Choose a plan</Link></article>)}{listings.filter((listing) => listing.status === "active").length === 0 && <div className="rounded-3xl border border-dashed border-[#C9D6CE] bg-white p-12 text-center md:col-span-2">Create and publish a listing before promoting it.</div>}</div>}</section></DashboardShell>;
}
