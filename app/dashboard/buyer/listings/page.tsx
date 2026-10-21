"use client";

import DashboardShell from "@/Components/DashboardShell";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { getMyListings } from "@/services/listingService";
import { getUserOffers } from "@/services/offerService";
import type { VehicleOffer } from "@/Types/offer";
import type { Vehicle } from "@/Types/vehicle";
import { BadgeDollarSign, CarFront, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function BuyerListingsPage() {
  return <RequireAuth><BuyerListingsContent /></RequireAuth>;
}

function BuyerListingsContent() {
  const { profile } = useAuth();
  const [listings, setListings] = useState<Vehicle[]>([]);
  const [offers, setOffers] = useState<VehicleOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    void Promise.all([getMyListings(profile.id), getUserOffers(profile.id)])
      .then(([ownedListings, userOffers]) => {
        if (cancelled) return;
        setListings(ownedListings);
        setOffers(userOffers.filter((offer) => offer.sellerId === profile.id));
      })
      .catch(() => {
        if (!cancelled) {
          setListings([]);
          setOffers([]);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [profile]);

  return <DashboardShell role="buyer"><section className="space-y-6"><header><p className="text-sm font-semibold text-[#718179]">Buyer workspace <span className="mx-2">/</span> My Listings</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">My Listings</h1><p className="mt-2 text-[#73827B]">Track listing reviews and see offers for approved vehicles.</p></header>
    {loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-[#07543D]" size={32}/></div> : listings.length === 0 ? <div className="rounded-2xl border border-dashed border-[#D8E3DC] bg-white p-12 text-center"><CarFront className="mx-auto text-[#83928A]"/><h2 className="mt-4 text-xl font-bold">No listings submitted yet</h2><p className="mt-2 text-sm text-[#718179]">Once you submit a vehicle, its review status will appear here.</p><Link href="/create-listing" className="mt-5 inline-flex rounded-xl bg-[#07543D] px-5 py-3 font-bold text-white">Submit a listing</Link></div> : <div className="space-y-4">{listings.map((listing) => {
      const isApproved = listing.status === "active";
      const listingOffers = isApproved ? offers.filter((offer) => offer.listingId === listing.id) : [];
      return <article key={listing.id} className="overflow-hidden rounded-2xl border border-[#E4EBE7] bg-white shadow-sm"><div className="grid gap-4 p-4 sm:grid-cols-[190px_minmax(0,1fr)]"><div className="relative min-h-40 overflow-hidden rounded-xl bg-[#EDF3EF]"><Image src={listing.coverImage || listing.images?.[0] || "/images/easy-ride-hero.svg"} alt={`${listing.year} ${listing.make} ${listing.model}`} fill sizes="190px" className="object-cover" unoptimized/></div><div><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black">{listing.year} {listing.make} {listing.model}</h2><span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${isApproved ? "bg-emerald-100 text-emerald-900" : listing.status === "rejected" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"}`}>{isApproved ? "Approved" : listing.status === "pending" ? "Under review" : listing.status}</span></div><p className="mt-2 text-sm text-[#718179]">For {listing.listingType === "rent" ? "rent" : "sale"} · {listing.location.city}, {listing.location.country}</p><p className="mt-2 font-bold">{listing.currency} {listing.price.toLocaleString()}{listing.listingType === "rent" ? ` / ${listing.priceLabel ?? "day"}` : ""}</p>{!isApproved && <p className="mt-3 text-sm text-[#718179]">{listing.status === "rejected" ? listing.rejectionReason || "This listing was not approved. Update it and resubmit for review." : "Offers will appear here once this listing is approved."}</p>}</div></div>
        {isApproved && <div className="border-t border-[#EEF2EF] p-4"><h3 className="flex items-center gap-2 font-black"><BadgeDollarSign size={18} className="text-[#07543D]"/>Offers ({listingOffers.length})</h3>{listingOffers.length ? <div className="mt-3 space-y-3">{listingOffers.map((offer) => <div key={offer.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F6F9F7] p-3"><div><p className="font-bold">{offer.buyerName}</p><p className="mt-1 text-sm text-[#718179]">{offer.status} · {offer.createdAt ? new Date(offer.createdAt).toLocaleDateString() : "Recently"}</p></div><p className="font-black">{offer.currency} {offer.offeredPrice.toLocaleString()}</p></div>)}</div> : <p className="mt-2 text-sm text-[#718179]">No offers yet for this approved listing.</p>}</div>}
      </article>;
    })}</div>}
  </section></DashboardShell>;
}
