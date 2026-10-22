"use client";

import CarCard from "@/Components/CarCard";
import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import { getDealerByOwner } from "@/services/dealerService";
import { getActiveListings } from "@/services/listingService";
import type { Dealer } from "@/Types/dealer";
import type { Vehicle } from "@/Types/vehicle";
import { BadgeCheck, Loader2, MapPin, Store } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function SellerPage() {
  const { id } = useParams<{ id: string }>();
  const [listings, setListings] = useState<Vehicle[]>([]);
  const [dealer, setDealer] = useState<Dealer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getActiveListings(), getDealerByOwner(id)])
      .then(([vehicles, dealerProfile]) => {
        if (!active) return;
        setListings(vehicles.filter((vehicle) => vehicle.ownerId === id));
        setDealer(dealerProfile?.status === "verified" ? dealerProfile : null);
      })
      .catch((error) => console.error("Could not load seller profile:", error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const sellerName = dealer?.businessName || listings[0]?.ownerName || "Seller";

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#0B5D3B]">
              <Store size={26} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold">{sellerName}</h1>
                {dealer?.verified && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#0B5D3B]"><BadgeCheck size={15} />Verified dealer</span>}
              </div>
              <p className="mt-2 text-gray-500">{dealer?.description || (listings[0] ? `${listings[0].sellerType} on Easy Ride` : "Vehicle seller on Easy Ride")}</p>
              {(dealer?.city || listings[0]?.location.city) && <p className="mt-3 flex items-center gap-1.5 text-sm text-gray-500"><MapPin size={16} />{dealer?.city || listings[0]?.location.city}{dealer?.country || listings[0]?.location.country ? `, ${dealer?.country || listings[0]?.location.country}` : ""}</p>}
            </div>
          </div>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-bold">Vehicles from {sellerName}</h2>
          {loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-[#0B5D3B]" size={30} /></div>
            : listings.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{listings.map((vehicle) => <CarCard key={vehicle.id} vehicle={vehicle} />)}</div>
            : <p className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-gray-500">This seller has no active listings right now.</p>}
        </div>
      </section>
      <Footer />
    </main>
  );
}
