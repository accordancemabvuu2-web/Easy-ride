"use client";

import DashboardShell from "@/Components/DashboardShell";
import DashboardWelcomeHero from "@/Components/DashboardWelcomeHero";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import { vehicles as demoVehicles } from "@/Data/vehicles";
import { getUserBookings } from "@/services/bookingService";
import { deleteListing, getMyListings, updateListingStatus } from "@/services/listingService";
import { getUserOffers } from "@/services/offerService";
import type { Vehicle } from "@/Types/vehicle";
import { AlertCircle, BarChart3, CheckCircle2, Eye, HandCoins, Loader2, Plus, Trash2, Users, CalendarDays, MessageCircle, Store } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Suspense } from "react";
import toast from "react-hot-toast";

export default function SellerDashboardPage() {
  return (
    <RequireAuth>
      <RoleGuard allowedRoles={["buyer", "seller", "dealer"]} label="Seller">
        <Suspense fallback={<div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="animate-spin text-[#08784D]" size={32} /></div>}>
          <SellerDashboardContent />
        </Suspense>
      </RoleGuard>
    </RequireAuth>
  );
}

function SellerDashboardContent() {
  const { profile, loading: authLoading } = useAuth();
  const [listings, setListings] = useState<Vehicle[]>([]);
  const [offerCount, setOfferCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [bookingCount, setBookingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
        setListings(demoVehicles);
        setOfferCount(4);
        setCompletedCount(3);
        setBookingCount(2);
        return;
      }
      if (!profile) { setLoading(false); return; }
      const [nextListings, offers, bookings] = await Promise.all([
        getMyListings(profile.id),
        getUserOffers(profile.id),
        getUserBookings(profile.id),
      ]);
      setListings(nextListings);
      setOfferCount(offers.filter((offer) => offer.sellerId === profile.id && ["pending", "countered"].includes(offer.status)).length);
      setCompletedCount(offers.filter((offer) => offer.sellerId === profile.id && offer.status === "completed").length + bookings.filter((booking) => booking.ownerId === profile.id && booking.status === "completed").length);
      setBookingCount(bookings.filter((booking) => booking.ownerId === profile.id && !["cancelled", "completed", "rejected"].includes(booking.status)).length);
    } catch {
      toast.error("Your seller workspace could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (authLoading && process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return;
    void loadDashboard();
  }, [authLoading, loadDashboard]);

  const stats = useMemo(() => ({
    total: listings.length,
    active: listings.filter((listing) => listing.status === "active").length,
    pending: listings.filter((listing) => listing.status === "pending").length,
    views: listings.reduce((total, listing) => total + (listing.views ?? 0), 0),
    enquiries: offerCount + bookingCount,
  }), [bookingCount, listings, offerCount]);

  const markUnavailable = async (listing: Vehicle) => {
    try {
      await updateListingStatus(listing.id, listing.listingType === "buy" ? "sold" : "rented");
      toast.success("Listing status updated.");
      await loadDashboard();
    } catch {
      toast.error("Listing status could not be updated.");
    }
  };

  const removeListing = async (listing: Vehicle) => {
    if (!window.confirm(`Delete ${listing.make} ${listing.model}?`)) return;
    try {
      await deleteListing(listing.id);
      toast.success("Listing deleted.");
      await loadDashboard();
    } catch {
      toast.error("Listing could not be deleted.");
    }
  };

  if (loading) {
    return <div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="animate-spin text-[#08784D]" size={32} /></div>;
  }

  if (!profile && process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    return <DashboardShell role="seller"><section className="mx-auto mt-16 max-w-xl rounded-3xl border border-[#DCE5DF] bg-white p-10 text-center"><h1 className="text-2xl font-black">Sign in to open Seller Studio</h1><p className="mt-2 text-[#718179]">Your seller dashboard and listings are available after you sign in.</p><Link href="/login" className="mt-5 inline-flex rounded-xl bg-[#063F2C] px-5 py-3 font-bold text-white">Sign in</Link></section></DashboardShell>;
  }

  return (
    <DashboardShell role="seller">
      <section>
        <DashboardWelcomeHero name={profile?.name?.trim().split(/\s+/)[0] || "there"} />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SellerMetric icon={<CheckCircle2 className="text-[#08784D]" />} label="Active listings" value={stats.active} />
          <SellerMetric icon={<Eye className="text-blue-500" />} label="Total views" value={stats.views.toLocaleString()} />
          <SellerMetric icon={<Users className="text-[#C9A227]" />} label="Enquiries" value={stats.enquiries} />
          <SellerMetric icon={<HandCoins className="text-purple-500" />} label="Completed deals" value={completedCount} />
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-[28px] border border-[#DCE5DF] bg-white p-6 shadow-[0_12px_32px_rgba(6,63,47,0.06)]">
            <div className="flex items-center justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.14em] text-[#08784D]">Inventory overview</p><h2 className="mt-1 text-xl font-black">Your listings at a glance</h2></div><BarChart3 className="text-[#08784D]" /></div>
            <div className="mt-7 grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-[#F4F8F5] p-4"><p className="text-xs font-semibold text-gray-500">All listings</p><p className="mt-2 text-3xl font-black">{stats.total}</p></div>
              <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-xs font-semibold text-emerald-800">Live</p><p className="mt-2 text-3xl font-black text-emerald-900">{stats.active}</p></div>
              <div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-800">In review</p><p className="mt-2 text-3xl font-black text-amber-900">{stats.pending}</p></div>
            </div>
            <p className="mt-5 text-sm text-gray-500">Views and enquiries are shown from your listings and current marketplace activity.</p>
          </section>
          <section className="rounded-[28px] border border-[#063F2F] bg-[#063F2F] p-6 text-white shadow-sm"><p className="text-sm font-bold uppercase tracking-[0.14em] text-[#A8E6C3]">Seller actions</p><h2 className="mt-2 text-xl font-black">Keep your inventory moving</h2><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><Link href="/dashboard/seller/leads" className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 text-sm font-semibold hover:bg-white/15"><MessageCircle size={18} className="text-[#E7B319]" /> View buyer leads</Link><Link href="/dashboard/seller/bookings" className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 text-sm font-semibold hover:bg-white/15"><CalendarDays size={18} className="text-[#E7B319]" /> Manage rentals</Link><Link href="/dashboard/seller/add-vehicle" className="flex items-center gap-3 rounded-2xl bg-white/10 p-3 text-sm font-semibold hover:bg-white/15"><Store size={18} className="text-[#E7B319]" /> Add another vehicle</Link></div><Link href="/dashboard/seller/leads" className="mt-7 inline-flex rounded-full bg-white px-5 py-3 text-sm font-bold text-[#063F2C]">View enquiries</Link></section>
        </div>

        <div className="mt-10 flex items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-[#08784D]">Inventory</p><h2 className="mt-1 text-2xl font-black">My listings</h2></div><Link href="/dashboard/seller/inventory" className="text-sm font-bold text-[#08784D] hover:underline">Manage all</Link></div>

        {listings.length === 0 ? <div className="mt-5 rounded-3xl border border-dashed border-[#C9D6CE] bg-white p-12 text-center"><CarEmpty /><h2 className="mt-4 text-xl font-bold">No vehicles listed yet</h2><p className="mt-2 text-gray-500">Add your first vehicle and start receiving interest.</p><Link href="/dashboard/seller/add-vehicle" className="mt-5 inline-flex rounded-full bg-[#063F2C] px-5 py-3 font-bold text-white">Add a vehicle</Link></div> : <div className="mt-5 space-y-4">{listings.slice(0, 6).map((listing) => <ListingRow key={listing.id} listing={listing} onMarkUnavailable={markUnavailable} onDelete={removeListing} />)}</div>}
      </section>
    </DashboardShell>
  );
}

function SellerMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) { return <div className="rounded-2xl border border-[#DCE5DF] bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div><div className="rounded-xl bg-[#F2F7F4] p-2">{icon}</div></div></div>; }

function ListingRow({ listing, onMarkUnavailable, onDelete }: { listing: Vehicle; onMarkUnavailable: (listing: Vehicle) => void; onDelete: (listing: Vehicle) => void }) { return <article className="grid gap-4 rounded-2xl border border-[#DCE5DF] bg-white p-4 shadow-sm sm:grid-cols-[140px_1fr_auto]"><div className="relative h-28 overflow-hidden rounded-xl"><Image src={listing.coverImage} alt={`${listing.make} ${listing.model}`} fill className="object-cover" sizes="140px" /></div><div><div className="flex flex-wrap items-center gap-3"><h3 className="text-lg font-black">{listing.make} {listing.model} {listing.year}</h3><StatusBadge status={listing.status} /></div><p className="mt-2 font-bold text-[#063F2C]">{listing.currency} {listing.price.toLocaleString()} <span className="text-sm font-medium text-gray-500">· {listing.location.city}</span></p><p className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500"><span className="flex items-center gap-1"><Eye size={14} /> {listing.views ?? 0} views</span><span className="flex items-center gap-1"><Users size={14} /> Enquiries tracked</span></p>{listing.status === "pending" && <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-700"><AlertCircle size={15} /> Awaiting verification</p>}</div><div className="flex flex-row gap-2 sm:flex-col"><Link href={`/vehicle/${listing.id}`} className="rounded-full border border-[#DCE5DF] px-4 py-2 text-center text-xs font-bold">View</Link>{listing.status === "active" && <button type="button" onClick={() => onMarkUnavailable(listing)} className="rounded-full border border-[#08784D] px-4 py-2 text-xs font-bold text-[#08784D]">Mark {listing.listingType === "buy" ? "sold" : "rented"}</button>}<button type="button" onClick={() => onDelete(listing)} className="rounded-full border border-red-200 px-4 py-2 text-xs font-bold text-red-600"><Trash2 className="mx-auto" size={15} /></button></div></article>; }

function StatusBadge({ status }: { status: Vehicle["status"] }) { const styles: Record<Vehicle["status"], string> = { draft: "bg-gray-100 text-gray-700", pending: "bg-amber-100 text-amber-800", active: "bg-green-100 text-green-800", rejected: "bg-red-100 text-red-700", sold: "bg-blue-100 text-blue-700", rented: "bg-purple-100 text-purple-700", suspended: "bg-red-100 text-red-700" }; return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${styles[status]}`}>{status}</span>; }

function CarEmpty() { return <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#08784D]/10 text-[#08784D]"><Plus size={22} /></div>; }
