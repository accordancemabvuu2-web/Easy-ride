"use client";

import DashboardShell from "@/Components/DashboardShell";
import FavoriteButton from "@/Components/FavoriteButton";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import { getUserFavoriteListings } from "@/services/favoriteService";
import { getActiveListings } from "@/services/listingService";
import { getUserOffers } from "@/services/offerService";
import { getUserBookings } from "@/services/bookingService";
import type { Vehicle } from "@/Types/vehicle";
import { BadgeDollarSign, CalendarDays, Heart, Loader2, MessageCircle, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function BuyerDashboardPage() {
  return (
    <RequireAuth>
      <RoleGuard allowedRoles={["buyer", "seller", "dealer"]} label="Marketplace">
        <BuyerDashboardContent />
      </RoleGuard>
    </RequireAuth>
  );
}

function BuyerDashboardContent() {
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [offerCount, setOfferCount] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const userId = profile.id;

    async function loadDashboard() {
      try {
        const [activeListings, favorites, offers, bookings] = await Promise.all([
          getActiveListings(),
          getUserFavoriteListings(userId),
          getUserOffers(userId),
          getUserBookings(userId),
        ]);
        setVehicles(activeListings.slice(0, 8));
        setSavedCount(favorites.length);
        setOfferCount(offers.filter((offer) => ["pending", "countered", "accepted"].includes(offer.status)).length);
        setBookingCount(bookings.filter((booking) => !["cancelled", "completed", "rejected"].includes(booking.status)).length);
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [profile]);

  const recommended = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return vehicles;
    return vehicles.filter((vehicle) => `${vehicle.make} ${vehicle.model} ${vehicle.location.city} ${vehicle.bodyType ?? ""}`.toLowerCase().includes(term));
  }, [search, vehicles]);

  if (loading) {
    return <div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="animate-spin text-[#08784D]" size={32} /></div>;
  }

  return (
    <DashboardShell role="buyer">
      <section>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#C9A227]">Buyer dashboard</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Good morning, {profile?.name?.split(" ")[0] ?? "there"}</h1>
        <p className="mt-2 text-gray-500">Find your next ride and keep every marketplace activity in one place.</p>

        <label className="mt-7 flex h-14 max-w-2xl items-center gap-3 rounded-2xl border border-[#DCE5DF] bg-white px-4 shadow-sm focus-within:border-[#08784D] focus-within:ring-2 focus-within:ring-[#08784D]/10">
          <Search className="text-gray-400" size={20} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cars, brands, models..." className="w-full bg-transparent outline-none" />
        </label>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <BuyerMetric icon={<Heart className="text-red-500" />} label="Saved vehicles" value={savedCount} href="/favorites" />
          <BuyerMetric icon={<BadgeDollarSign className="text-[#C9A227]" />} label="Active offers" value={offerCount} href="/offers" />
          <BuyerMetric icon={<CalendarDays className="text-[#08784D]" />} label="Upcoming bookings" value={bookingCount} href="/bookings" />
          <BuyerMetric icon={<MessageCircle className="text-blue-500" />} label="Messages" value="Open" href="/messages" />
        </div>

        <div className="mt-10 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#08784D]">Curated for you</p>
            <h2 className="mt-1 text-2xl font-black">Recommended vehicles</h2>
          </div>
          <Link href="/" className="text-sm font-bold text-[#08784D] hover:underline">Browse all</Link>
        </div>

        {recommended.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-[#C9D6CE] bg-white p-12 text-center">
            <Search className="mx-auto text-gray-300" size={38} />
            <h2 className="mt-4 text-xl font-bold">No matching vehicles</h2>
            <Link href="/" className="mt-5 inline-flex rounded-full bg-[#063F2C] px-5 py-3 font-bold text-white">Browse marketplace</Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {recommended.slice(0, 4).map((vehicle) => <RecommendedVehicle key={vehicle.id} vehicle={vehicle} />)}
          </div>
        )}
      </section>
    </DashboardShell>
  );
}

function BuyerMetric({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string | number; href: string }) {
  return <Link href={href} className="rounded-2xl border border-[#DCE5DF] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#08784D] hover:shadow-md"><div className="flex items-start justify-between"><div><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-3xl font-black text-[#17201D]">{value}</p></div><div className="rounded-xl bg-[#F2F7F4] p-2">{icon}</div></div></Link>;
}

function RecommendedVehicle({ vehicle }: { vehicle: Vehicle }) {
  return <article className="group overflow-hidden rounded-2xl border border-[#DCE5DF] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="relative aspect-[4/3] overflow-hidden bg-[#EEF4F0]"><Link href={`/vehicle/${vehicle.id}`}><Image src={vehicle.coverImage} alt={`${vehicle.make} ${vehicle.model}`} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 25vw" /></Link><div className="absolute right-3 top-3"><FavoriteButton listingId={vehicle.id} compact /></div>{vehicle.listingType === "rent" && <span className="absolute bottom-3 left-3 rounded-full bg-[#08784D] px-3 py-1 text-xs font-bold text-white">Available</span>}</div><div className="p-4"><Link href={`/vehicle/${vehicle.id}`}><h3 className="font-bold group-hover:text-[#08784D]">{vehicle.make} {vehicle.model} {vehicle.year}</h3></Link><p className="mt-2 text-xl font-black text-[#063F2C]">{vehicle.currency} {vehicle.price.toLocaleString()}<span className="ml-1 text-xs font-medium text-gray-500">{vehicle.listingType === "rent" ? `/${vehicle.priceLabel ?? "day"}` : ""}</span></p><p className="mt-2 text-sm text-gray-500">{vehicle.location.city}, {vehicle.location.country}</p><p className="mt-2 text-xs text-gray-500">{vehicle.transmission} · {vehicle.fuelType} · {vehicle.bodyType ?? "Vehicle"}</p><Link href={`/vehicle/${vehicle.id}`} className="mt-4 block text-sm font-bold text-[#08784D]">View vehicle</Link></div></article>;
}
