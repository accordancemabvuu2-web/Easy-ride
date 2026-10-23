"use client";

import DealerSidebar from "@/Components/DealerSidebar";
import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import { getMyListings } from "@/services/listingService";
import type { Vehicle } from "@/Types/vehicle";
import { CarFront, Loader2, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DealerInventoryPage() {
  return (
    <RequireAuth>
      <RoleGuard allowedRoles={["dealer"]} label="Dealer">
        <DealerInventoryContent />
      </RoleGuard>
    </RequireAuth>
  );
}

function DealerInventoryContent() {
  const { profile } = useAuth();
  const [listings, setListings] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!profile) return;
      try {
        setLoading(true);
        setListings(await getMyListings(profile.id));
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [profile]);

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-[280px_1fr] lg:px-6">
        <DealerSidebar />
        <div>
          <div className="flex items-center gap-3">
            <CarFront className="text-[#0B5D3B]" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
                Inventory
              </p>
              <h1 className="text-4xl font-bold">Dealer inventory</h1>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-gray-500">Manage all of your active and pending vehicles.</p>
            <Link href="/create-listing" className="inline-flex items-center gap-2 rounded-full bg-[#0B5D3B] px-5 py-3 font-semibold text-white">
              <Plus size={18} />
              Add Vehicle
            </Link>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <Loader2 className="animate-spin text-[#0B5D3B]" size={28} />
            </div>
          ) : listings.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center">
              <h2 className="text-2xl font-bold">No vehicles yet</h2>
              <p className="mt-2 text-gray-500">Add your first vehicle to start building inventory.</p>
            </div>
          ) : (
            <div className="mt-8 grid gap-5">
              {listings.map((listing) => (
                <article key={listing.id} className="grid gap-5 rounded-3xl border border-[#E5E7EB] bg-white p-4 sm:grid-cols-[180px_1fr_auto]">
                  <div className="relative h-36 overflow-hidden rounded-2xl">
                    <Image src={listing.coverImage} alt={`${listing.make} ${listing.model}`} fill className="object-cover" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{listing.make} {listing.model} {listing.year}</h2>
                    <p className="mt-2 text-2xl font-bold text-[#0B5D3B]">{listing.currency} {listing.price.toLocaleString()}</p>
                    <p className="mt-2 text-sm text-gray-500">{listing.location.city}, {listing.location.country}</p>
                    <p className="mt-2 text-sm text-gray-500">Status: {listing.status}</p>
                  </div>
                  <div className="flex flex-row gap-2 sm:flex-col">
                    <Link href={`/vehicle/${listing.id}`} className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold">
                      View
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
