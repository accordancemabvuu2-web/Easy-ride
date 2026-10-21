"use client";

import DashboardShell, { useDashboardSearch } from "@/Components/DashboardShell";
import DashboardWelcomeHero from "@/Components/DashboardWelcomeHero";
import VehicleDetailsModal from "@/Components/VehicleDetailsModal";
import OfferForm from "@/Components/OfferForm";
import FavoriteButton from "@/Components/FavoriteButton";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import { vehicles as demoVehicles } from "@/Data/vehicles";
import { getUserFavoriteListings } from "@/services/favoriteService";
import { getActiveListings } from "@/services/listingService";
import { getUserOffers } from "@/services/offerService";
import { getUserBookings } from "@/services/bookingService";
import type { Vehicle } from "@/Types/vehicle";
import { BadgeDollarSign, CalendarDays, Heart, Loader2, MessageCircle, Search, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

export default function BuyerDashboardPage() {
  return (
    <RequireAuth>
      <RoleGuard allowedRoles={["buyer", "seller", "dealer"]} label="Marketplace">
        <Suspense fallback={<div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="animate-spin text-[#08784D]" size={32} /></div>}>
          <BuyerDashboardContent />
        </Suspense>
      </RoleGuard>
    </RequireAuth>
  );
}

function BuyerDashboardContent() {
  const { profile, loading: authLoading } = useAuth();
  const dashboardSearch = useDashboardSearch();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "rent" ? "rent" : "buy";
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [favoriteVehicles, setFavoriteVehicles] = useState<Vehicle[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [offerCount, setOfferCount] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [detailsVehicle, setDetailsVehicle] = useState<Vehicle|null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!profile) { setLoading(false); return; }
    const userId = profile.id;
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setLoadError("");
      try {
        if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
          setVehicles(demoVehicles.filter((vehicle) => vehicle.listingType === mode));
          setFavoriteVehicles(demoVehicles.slice(0, 2));
          setSavedCount(2);
          setOfferCount(3);
          setBookingCount(2);
          return;
        }
        const [activeListings, favorites, offers, bookings] = await Promise.all([
          getActiveListings(),
          getUserFavoriteListings(userId),
          getUserOffers(userId),
          getUserBookings(userId),
        ]);
        if (cancelled) return;
        setVehicles(activeListings.filter((vehicle) => vehicle.listingType === mode));
        setFavoriteVehicles(favorites);
        setSavedCount(favorites.length);
        setOfferCount(offers.filter((offer) => ["pending", "countered", "accepted"].includes(offer.status)).length);
        setBookingCount(bookings.filter((booking) => !["cancelled", "completed", "rejected"].includes(booking.status)).length);
      } catch {
        if (!cancelled) {
          setLoadError("We couldn't load your dashboard data. Your saved vehicles and marketplace recommendations are still available after you retry.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [authLoading, mode, profile, retryKey]);

  const recommended = useMemo(() => {
    const term = (search || dashboardSearch).trim().toLowerCase();
    const favoriteIds = new Set(favoriteVehicles.map((vehicle) => vehicle.id));
    const favoriteMakes = new Set(favoriteVehicles.map((vehicle) => vehicle.make.toLowerCase()));
    const favoriteBodies = new Set(favoriteVehicles.map((vehicle) => vehicle.bodyType?.toLowerCase()).filter(Boolean));
    const favoriteFuelTypes = new Set(favoriteVehicles.map((vehicle) => vehicle.fuelType.toLowerCase()));
    const favoriteTransmissions = new Set(favoriteVehicles.map((vehicle) => vehicle.transmission.toLowerCase()));
    const averageFavoritePrice = favoriteVehicles.length
      ? favoriteVehicles.reduce((total, vehicle) => total + vehicle.price, 0) / favoriteVehicles.length
      : 0;

    return vehicles
      .filter((vehicle) => !term || `${vehicle.make} ${vehicle.model} ${vehicle.location.city} ${vehicle.bodyType ?? ""}`.toLowerCase().includes(term))
      .sort((first, second) => recommendationScore(second, {
        favoriteIds,
        favoriteMakes,
        favoriteBodies,
        favoriteFuelTypes,
        favoriteTransmissions,
        averageFavoritePrice,
      }) - recommendationScore(first, {
        favoriteIds,
        favoriteMakes,
        favoriteBodies,
        favoriteFuelTypes,
        favoriteTransmissions,
        averageFavoritePrice,
      }));
  }, [dashboardSearch, favoriteVehicles, search, vehicles]);

  if (loading) {
    return <div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="animate-spin text-[#08784D]" size={32} /></div>;
  }

  if (!profile) {
    return <DashboardShell role="buyer"><section className="mx-auto mt-16 max-w-xl rounded-3xl border border-[#DCE5DF] bg-white p-10 text-center"><h1 className="text-2xl font-black">Sign in to open your marketplace</h1><p className="mt-2 text-gray-600">Your account session could not be restored.</p><Link href="/login" className="mt-5 inline-flex rounded-xl bg-[#063F2C] px-5 py-3 font-bold text-white">Sign in</Link></section></DashboardShell>;
  }

  return (
    <DashboardShell role="buyer">
      <section>
        <DashboardWelcomeHero name={profile?.name?.trim().split(/\s+/)[0] || "there"} />

        <div className="mt-6 inline-flex rounded-full border border-[#DCE5DF] bg-white p-1 shadow-sm">
          <Link href="/dashboard/buyer?mode=buy" className={`rounded-full px-6 py-2 text-sm font-bold shadow-sm ${mode === "buy" ? "bg-[#063F2F] text-white" : "text-gray-500 hover:text-[#08784D]"}`}>Buy vehicles</Link>
          <Link href="/dashboard/buyer?mode=rent" className={`rounded-full px-6 py-2 text-sm font-bold ${mode === "rent" ? "bg-[#063F2F] text-white" : "text-gray-500 hover:text-[#08784D]"}`}>Rent vehicles</Link>
        </div>

        <label className="mt-6 flex h-14 max-w-3xl items-center gap-3 rounded-2xl border border-[#DCE5DF] bg-white px-4 shadow-[0_12px_30px_rgba(6,63,47,0.06)]">
          <Search className="text-[#08784D]" size={20} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={mode === "rent" ? "Search rental vehicles, makes or locations..." : "Search cars, makes, models or locations..."} className="w-full bg-transparent outline-none" />
        </label>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <BuyerMetric icon={<Heart className="text-[#9A4B52]" />} label="Saved Vehicles" value={savedCount} href="/favorites" />
          <BuyerMetric icon={<BadgeDollarSign className="text-[#8B6A16]" />} label="Active Offers" value={offerCount} href="/offers" />
          <BuyerMetric icon={<CalendarDays className="text-[#07543D]" />} label="Upcoming Bookings" value={bookingCount} href="/bookings" />
          <BuyerMetric icon={<MessageCircle className="text-[#426985]" />} label="Unread Messages" value="4" href="/messages" />
        </div>

        {loadError && (
          <div role="alert" className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#E2D3A8] bg-[#FBF7EA] p-4 text-sm text-[#574719] sm:flex-row sm:items-center sm:justify-between">
            <p>{loadError}</p>
            <button type="button" onClick={() => setRetryKey((current) => current + 1)} className="shrink-0 rounded-full bg-[#063F2C] px-4 py-2 font-bold text-white hover:bg-[#08784D]">Retry</button>
          </div>
        )}

        <div className="mt-10 flex items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-[#80631A]"><Sparkles size={15} /> {favoriteVehicles.length ? "Based on your saved vehicles" : "Recommended for you"}</p>
            <h2 className="mt-1 text-2xl font-black">{mode === "rent" ? "Vehicles available to rent" : "Vehicles available to buy"}</h2>
          </div>
          <Link href={`/dashboard/buyer?mode=${mode}`} className="text-sm font-bold text-[#08784D] hover:underline">View all</Link>
        </div>

        {recommended.length === 0 ? (
          <div className="mt-5 rounded-xl border border-[#CEDBD0] bg-white p-10 text-center">
            <Search className="mx-auto text-gray-300" size={38} />
            <h2 className="mt-4 text-xl font-bold">{search ? "No vehicles match your search" : mode === "rent" ? "No rental vehicles are available yet" : "No vehicles are available yet"}</h2>
            <p className="mt-2 text-sm text-gray-500">{search ? "Try a different make, model or location." : "Check back soon as sellers add more vehicles."}</p>
            {search && <button type="button" onClick={() => setSearch("")} className="mt-5 rounded-full bg-[#063F2C] px-5 py-3 font-bold text-white">Clear search</button>}
          </div>
        ) : (
          <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {recommended.slice(0, 4).map((vehicle) => <RecommendedVehicle key={vehicle.id} vehicle={vehicle} onView={()=>setDetailsVehicle(vehicle)} />)}
          </div>
        )}
      </section>
      {detailsVehicle&&<VehicleDetailsModal vehicle={detailsVehicle} onClose={()=>setDetailsVehicle(null)} actions={detailsVehicle.listingType === "buy" ? <OfferForm vehicle={detailsVehicle}/> : undefined}/>}
    </DashboardShell>
  );
}

function BuyerMetric({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string | number; href: string }) {
  return <Link href={href} className="rounded-xl border border-[#DCE5DF] bg-[#FBFCFB] p-5 shadow-[0_2px_8px_rgba(23,37,30,0.04)] transition hover:-translate-y-0.5 hover:border-[#6FA58D] hover:shadow-md"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-wide text-[#53645B]">{label}</p><p className="mt-2 text-3xl font-black text-[#17231D]">{value}</p><p className="mt-2 text-xs font-semibold text-[#07543D]">View details</p></div><div className="rounded-xl bg-[#EAF2ED] p-2">{icon}</div></div></Link>;
}

interface RecommendationPreferences {
  favoriteIds: Set<string>;
  favoriteMakes: Set<string>;
  favoriteBodies: Set<string | undefined>;
  favoriteFuelTypes: Set<string>;
  favoriteTransmissions: Set<string>;
  averageFavoritePrice: number;
}

function recommendationScore(vehicle: Vehicle, preferences: RecommendationPreferences) {
  let score = vehicle.featured ? 1 : 0;
  if (preferences.favoriteIds.has(vehicle.id)) score -= 100;
  if (preferences.favoriteMakes.has(vehicle.make.toLowerCase())) score += 5;
  if (vehicle.bodyType && preferences.favoriteBodies.has(vehicle.bodyType.toLowerCase())) score += 3;
  if (preferences.favoriteFuelTypes.has(vehicle.fuelType.toLowerCase())) score += 2;
  if (preferences.favoriteTransmissions.has(vehicle.transmission.toLowerCase())) score += 2;
  if (preferences.averageFavoritePrice > 0) {
    const priceDifference = Math.abs(vehicle.price - preferences.averageFavoritePrice) / preferences.averageFavoritePrice;
    score += Math.max(0, 2 - priceDifference);
  }
  return score;
}

function RecommendedVehicle({ vehicle, onView }: { vehicle: Vehicle; onView: () => void }) {
  return <article className="group overflow-hidden rounded-2xl border border-[#DCE5DF] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"><div className="relative aspect-[4/3] overflow-hidden bg-[#EEF4F0]"><button type="button" onClick={onView} className="absolute inset-0 z-0" aria-label={`View details for ${vehicle.make} ${vehicle.model}`}><Image src={vehicle.coverImage} alt={`${vehicle.make} ${vehicle.model}`} fill className="object-cover transition duration-500 group-hover:scale-105" sizes="(max-width: 640px) 100vw, 25vw" /></button><div className="absolute right-3 top-3 z-10"><FavoriteButton listingId={vehicle.id} compact /></div>{vehicle.listingType === "rent" && <span className="absolute bottom-3 left-3 rounded-full bg-[#08784D] px-3 py-1 text-xs font-bold text-white">Available</span>}</div><div className="p-4"><button type="button" onClick={onView} className="text-left font-bold group-hover:text-[#08784D]">{vehicle.make} {vehicle.model} {vehicle.year}</button><p className="mt-2 text-xl font-black text-[#063F2C]">{vehicle.currency} {vehicle.price.toLocaleString()}<span className="ml-1 text-xs font-medium text-gray-500">{vehicle.listingType === "rent" ? `/${vehicle.priceLabel ?? "day"}` : ""}</span></p><p className="mt-2 text-sm text-gray-500">{vehicle.location.city}, {vehicle.location.country}</p><p className="mt-2 text-xs text-gray-500">{vehicle.transmission} · {vehicle.fuelType} · {vehicle.bodyType ?? "Vehicle"}</p><button type="button" onClick={onView} className="mt-4 block text-sm font-bold text-[#08784D]">View details</button></div></article>;
}
