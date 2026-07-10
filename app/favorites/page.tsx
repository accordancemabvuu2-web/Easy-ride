"use client";

import CarCard from "@/Components/CarCard";
import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { getUserFavoriteListings } from "@/services/favoriteService";
import type { Vehicle } from "@/Types/vehicle";
import { Heart, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function FavoritesPage() {
  return (
    <RequireAuth>
      <FavoritesContent />
    </RequireAuth>
  );
}

function FavoritesContent() {
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFavorites() {
      if (!profile) {
        return;
      }

      try {
        setLoading(true);
        setVehicles(await getUserFavoriteListings(profile.id));
      } catch {
        toast.error("Saved vehicles could not be loaded.");
      } finally {
        setLoading(false);
      }
    }

    void loadFavorites();
  }, [profile]);

  return (
    <main className="min-h-screen bg-[#F8F9FA]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="flex items-center gap-3">
          <Heart className="text-[#0B5D3B]" />
          <h1 className="text-4xl font-bold">Saved vehicles</h1>
        </div>

        <p className="mt-3 text-gray-500">
          Vehicles you saved for later comparison.
        </p>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
          </div>
        ) : vehicles.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-14 text-center">
            <Heart className="mx-auto text-gray-400" size={40} />
            <h2 className="mt-5 text-2xl font-bold">No saved vehicles</h2>
            <p className="mt-2 text-gray-500">
              Tap the heart icon on any listing to save it.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {vehicles.map((vehicle) => (
              <CarCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
