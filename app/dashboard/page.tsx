"use client";

import DashboardShell from "@/Components/DashboardShell";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { getUserBookings } from "@/services/bookingService";
import { getUserFavoriteListings } from "@/services/favoriteService";
import { getActiveListings } from "@/services/listingService";
import { getUserOffers } from "@/services/offerService";
import type { Vehicle } from "@/Types/vehicle";
import { BadgeDollarSign, CalendarDays, Heart, Loader2, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardRouter />
    </RequireAuth>
  );
}

function DashboardRouter() {
  const { profile, loading } = useAuth();

  if (loading || !profile) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]"><Loader2 className="animate-spin text-[#0B5D3B]" size={32} /></div>;
  }

  if (profile.role === "admin") {
    return <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]"><Link href="/admin" className="rounded-full bg-[#0B5D3B] px-6 py-3 font-bold text-white">Open admin dashboard</Link></div>;
  }

  if (profile.role === "dealer") {
    return <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]"><Link href="/dealer/dashboard" className="rounded-full bg-[#0B5D3B] px-6 py-3 font-bold text-white">Open dealer dashboard</Link></div>;
  }

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#F8F9FA]"><Loader2 className="animate-spin text-[#0B5D3B]" size={32} /></div>}>
      <PersonalDashboard />
    </Suspense>
  );
}

function PersonalDashboard() {
  const { profile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "rent" ? "rent" : "buy";
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [offerCount, setOfferCount] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
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
        setVehicles(activeListings.filter((vehicle) => mode === "rent" ? vehicle.listingType === "rent" : vehicle.listingType === "buy").slice(0, 3));
        setSavedCount(favorites.length);
        setOfferCount(offers.filter((offer) => ["pending", "countered", "accepted"].includes(offer.status)).length);
        setBookingCount(bookings.filter((booking) => !["cancelled", "completed", "rejected"].includes(booking.status)).length);
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [mode, profile]);

  if (loading) {
    return <div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="animate-spin text-[#08784D]" size={32} /></div>;
  }

  return (
    <DashboardShell role="personal">
      <section>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#C9A227]">Customer dashboard</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Good afternoon, {profile?.name?.split(" ")[0] ?? "there"}</h1>
        <p className="mt-2 text-gray-500">{mode === "rent" ? "Plan your next trip and keep your rental activity in one place." : "Find something you&apos;ll love and keep your Easy Ride activity in one place."}</p>

        <div className="mt-7 inline-flex rounded-full border border-[#DCE5DF] bg-white p-1 shadow-sm">
          {(["buy", "rent"] as const).map((nextMode) => (
            <button
              key={nextMode}
              type="button"
              onClick={() => router.replace(`/dashboard?mode=${nextMode}`, { scroll: false })}
              className={`rounded-full px-6 py-2.5 text-sm font-bold capitalize transition ${mode === nextMode ? "bg-[#0B5D3B] text-white" : "text-gray-600 hover:text-[#0B5D3B]"}`}
            >
              {nextMode === "buy" ? "Buy" : "Rent"}
            </button>
          ))}
        </div>

        <Link href={`/marketplace?mode=${mode}`} className="mt-7 flex h-14 max-w-2xl items-center gap-3 rounded-2xl border border-[#DCE5DF] bg-white px-4 text-gray-400 shadow-sm transition hover:border-[#08784D]"><Search size={20} /><span>{mode === "rent" ? "Find a vehicle to rent..." : "Search vehicles..."}</span></Link>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          <DashboardMetric icon={<Heart className="text-red-500" />} label="Favorites" value={savedCount} href="/favorites" />
          <DashboardMetric icon={<BadgeDollarSign className="text-[#C9A227]" />} label="Offers" value={offerCount} href="/offers" />
          <DashboardMetric icon={<CalendarDays className="text-[#08784D]" />} label={mode === "rent" ? "Upcoming rentals" : "Bookings"} value={bookingCount} href="/bookings" />
        </div>

        <div className="mt-10 flex items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-[#08784D]">Recently viewed</p><h2 className="mt-1 text-2xl font-black">Recommended vehicles</h2></div><Link href="/" className="text-sm font-bold text-[#08784D] hover:underline">Browse all</Link></div>

        {vehicles.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-[#C9D6CE] bg-white p-12 text-center"><Search className="mx-auto text-gray-300" size={38} /><h2 className="mt-4 text-xl font-bold">{mode === "rent" ? "Find a vehicle to rent" : "Start exploring vehicles"}</h2><Link href={`/marketplace?mode=${mode}`} className="mt-5 inline-flex rounded-full bg-[#063F2C] px-5 py-3 font-bold text-white">Browse marketplace</Link></div>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-3">{vehicles.map((vehicle) => <Link key={vehicle.id} href={`/vehicle/${vehicle.id}`} className="group overflow-hidden rounded-2xl border border-[#DCE5DF] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="relative aspect-[4/3] overflow-hidden bg-[#EEF4F0]"><Image src={vehicle.coverImage} alt={`${vehicle.make} ${vehicle.model}`} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" /></div><div className="p-4"><h3 className="font-bold group-hover:text-[#08784D]">{vehicle.make} {vehicle.model} {vehicle.year}</h3><p className="mt-2 font-black text-[#063F2C]">{vehicle.currency} {vehicle.price.toLocaleString()}</p><p className="mt-1 text-sm text-gray-500">{vehicle.location.city}, {vehicle.location.country}</p></div></Link>)}</div>
        )}

        <div className="mt-10 flex flex-col gap-4 rounded-3xl bg-[#063F2C] p-6 text-white sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.14em] text-[#A8E6C3]">Grow with Easy Ride</p><h2 className="mt-2 text-xl font-black">{mode === "rent" ? "Have a vehicle to rent?" : "Interested in selling vehicles?"}</h2><p className="mt-1 text-sm text-white/70">List vehicles, manage enquiries and grow your Easy Ride activity from one account.</p></div><Link href="/create-listing" className="inline-flex shrink-0 rounded-full bg-white px-5 py-3 text-sm font-bold text-[#063F2C]">{mode === "rent" ? "List a rental" : "Add a vehicle"}</Link></div>
      </section>
    </DashboardShell>
  );
}

function DashboardMetric({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: number; href: string }) {
  return <Link href={href} className="rounded-2xl border border-[#DCE5DF] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#08784D] hover:shadow-md"><div className="flex items-start justify-between"><div><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-3xl font-black text-[#17201D]">{value}</p></div><div className="rounded-xl bg-[#F2F7F4] p-2">{icon}</div></div></Link>;
}

// Legacy code kept for reference - now uses role-based routing above
/*
function DashboardContent() {
  const { profile } = useAuth();
  const [listings, setListings] = useState<Vehicle[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  const loadListings = useCallback(async () => {
    if (!profile) return;
    try {
      setLoadingListings(true);
      setListings(await getMyListings(profile.id));
    } catch {
      toast.error("Your listings could not be loaded.");
    } finally {
      setLoadingListings(false);
    }
  }, [profile]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadListings();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadListings]);

  const stats = useMemo(
    () => ({
      total: listings.length,
      active: listings.filter((listing) => listing.status === "active").length,
      pending: listings.filter((listing) => listing.status === "pending").length,
    }),
    [listings]
  );

  const removeListing = async (listing: Vehicle) => {
    if (!window.confirm("Delete this listing?")) {
      return;
    }

    try {
      await deleteListing(listing.id);
      toast.success("Listing deleted.");
      await loadListings();
    } catch {
      toast.error("Listing could not be deleted.");
    }
  };

  const markSold = async (listing: Vehicle) => {
    try {
      await updateListingStatus(listing.id, listing.listingType === "buy" ? "sold" : "rented");
      toast.success("Listing updated.");
      await loadListings();
    } catch {
      toast.error("Status could not be updated.");
    }
  };

*/
