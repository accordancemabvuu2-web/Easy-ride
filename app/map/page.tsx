"use client";

import MarketplaceMap from "@/Components/MarketplaceMap";
import Navbar from "@/Components/Navbar";
import { getActiveListings } from "@/services/listingService";
import type { Vehicle } from "@/Types/vehicle";
import { Loader2, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function MapPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setVehicles(await getActiveListings());
      } catch {
        toast.error("Map listings could not be loaded.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  return (
    <main className="min-h-screen bg-[#F8F9FA]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
            Location discovery
          </p>
          <h1 className="mt-2 text-4xl font-bold">Find vehicles near you</h1>
          <p className="mt-3 text-gray-500">
            Explore approved vehicle listings using their approximate public locations.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-[620px] items-center justify-center">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={34} />
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
            <MarketplaceMap
              vehicles={vehicles}
              onVehicleSelect={setSelectedVehicle}
            />

            <aside className="h-fit rounded-3xl border border-[#E5E7EB] bg-white p-5">
              {selectedVehicle ? (
                <>
                  <div className="relative h-44 w-full overflow-hidden rounded-2xl bg-gray-100">
                    <Image
                      src={selectedVehicle.coverImage}
                      alt={`${selectedVehicle.make} ${selectedVehicle.model}`}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <h2 className="mt-5 text-xl font-bold">
                    {selectedVehicle.make} {selectedVehicle.model} {selectedVehicle.year}
                  </h2>

                  <p className="mt-2 text-2xl font-bold text-[#0B5D3B]">
                    {selectedVehicle.currency} {selectedVehicle.price.toLocaleString()}
                  </p>

                  <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                    <MapPin size={16} />
                    {selectedVehicle.location.city}
                  </p>

                  <Link
                    href={`/vehicle/${selectedVehicle.id}`}
                    className="mt-5 block rounded-full bg-[#0B5D3B] px-5 py-3 text-center font-bold text-white"
                  >
                    View Details
                  </Link>
                </>
              ) : (
                <div className="py-10 text-center">
                  <MapPin className="mx-auto text-[#0B5D3B]" size={34} />
                  <h2 className="mt-4 font-bold">Select a map marker</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    Click a vehicle marker to see its details.
                  </p>
                </div>
              )}
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
