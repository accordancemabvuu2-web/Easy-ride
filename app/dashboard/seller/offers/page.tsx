"use client";

import SellerTab from "@/app/offers/page";
import { useAuth } from "@/contexts/AuthContext";
import { getMyListings } from "@/services/listingService";
import type { Vehicle } from "@/Types/vehicle";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Page() {
  const { profile } = useAuth();
  const [listings, setListings] = useState<Vehicle[]>([]);

  useEffect(() => {
    if (!profile) return;
    void getMyListings(profile.id).then(setListings).catch(() => setListings([]));
  }, [profile]);

  const activeListings = listings.filter((listing) => listing.status === "active");

  return <div className="space-y-8"><section className="rounded-3xl border border-[#DCE5DF] bg-white p-5 shadow-sm sm:p-7"><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#08784D]">Seller activity</p><h1 className="mt-1 text-2xl font-black">Potential buyers and renters</h1><p className="mt-2 text-sm text-[#718179]">See active listings attracting interest, including vehicles available to rent.</p>{activeListings.length ? <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{activeListings.map((listing) => <article key={listing.id} className="overflow-hidden rounded-2xl border border-[#E4EBE7] bg-[#FBFCFB]"><div className="relative h-44"><Image src={listing.coverImage} alt={`${listing.year} ${listing.make} ${listing.model}`} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover"/></div><div className="p-4"><div className="flex items-start justify-between gap-3"><h2 className="font-black">{listing.year} {listing.make} {listing.model}</h2><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold capitalize text-emerald-900">For {listing.listingType === "rent" ? "rent" : "sale"}</span></div><p className="mt-2 text-sm text-slate-500">{listing.location.city}, {listing.location.country}</p><p className="mt-3 text-lg font-black">{listing.currency} {listing.price.toLocaleString()}{listing.listingType === "rent" ? ` / ${listing.priceLabel ?? "day"}` : ""}</p><p className="mt-2 text-sm text-slate-600">{listing.enquiries ?? 0} enquiries · {listing.offers ?? 0} offers</p><Link href={listing.listingType === "rent" ? "/dashboard/seller/rentals" : "/dashboard/seller/leads"} className="mt-4 inline-flex rounded-full bg-[#07543D] px-4 py-2 text-sm font-bold text-white">{listing.listingType === "rent" ? "View rental requests" : "View buyer leads"}</Link></div></article>)}</div> : <p className="mt-5 rounded-xl bg-[#F6F9F7] p-4 text-sm text-slate-600">Your active sale and rental listings will appear here.</p>}</section><SellerTab /></div>;
}
