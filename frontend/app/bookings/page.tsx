"use client";

import BookingStatusBadge from "@/Components/BookingStatusBadge";
import DashboardShell from "@/Components/DashboardShell";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { vehicles as demoVehicles } from "@/Data/vehicles";
import { getActiveListings } from "@/services/listingService";
import {
  approveBooking,
  cancelBooking,
  getUserBookings,
  rejectBooking,
} from "@/services/bookingService";
import type { RentalBooking } from "@/Types/booking";
import type { Vehicle } from "@/Types/vehicle";
import { CalendarDays, Check, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function BookingsPage() {
  return (
    <RequireAuth>
      <BookingsContent />
    </RequireAuth>
  );
}

function BookingsContent() {
  const { profile } = useAuth();
  const isSeller = profile?.role === "seller" || profile?.role === "dealer";
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailsBooking, setDetailsBooking] = useState<RentalBooking|null>(null);
  const [availableRentals, setAvailableRentals] = useState<Vehicle[]>([]);
  const [showRentals, setShowRentals] = useState(false);

  const loadBookings = useCallback(async () => {
    if (!profile) {
      return;
    }

    setLoading(true);
    try {
      const saved = process.env.NEXT_PUBLIC_DEMO_MODE === "true" ? [] : await getUserBookings(profile.id);
      if (!saved.length && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
        const now = new Date();
        const date = (offset: number) => new Date(now.getTime() + offset * 86400000).toISOString().slice(0, 10);
        const rentals = demoVehicles.filter((vehicle) => vehicle.listingType === "rent");
        setBookings(rentals.slice(0, 2).map((vehicle, index) => ({ id: `demo-booking-${index}`, listingId: vehicle.id, listingTitle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`, listingImage: vehicle.coverImage, renterId: isSeller ? `demo-renter-${index}` : profile.id, renterName: isSeller ? ["Maya Chen", "Jordan Williams"][index] : profile.name, renterEmail: "renter@example.com", renterPhone: "+263 77 111 2222", ownerId: isSeller ? profile.id : `demo-owner-${index}`, ownerName: isSeller ? profile.name : vehicle.ownerName, pickupDate: date(index + 1), returnDate: date(index + 4), totalDays: 3, dailyRate: vehicle.price, subtotal: vehicle.price * 3, serviceFee: 0, deposit: 0, totalAmount: vehicle.price * 3, currency: vehicle.currency, status: (index === 0 ? "confirmed" : "pending") as RentalBooking["status"], renterMessage: "Looking forward to the trip.", paymentStatus: "paid" as const, createdAt: now.toISOString(), updatedAt: now.toISOString() })));
      } else setBookings(saved);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Bookings could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [profile, isSeller]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    if (isSeller) return;
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      setAvailableRentals(demoVehicles.filter((vehicle) => vehicle.listingType === "rent" && vehicle.status === "active"));
      return;
    }
    void getActiveListings().then((listings) => setAvailableRentals(listings.filter((vehicle) => vehicle.listingType === "rent"))).catch(() => setAvailableRentals([]));
  }, [isSeller]);

  const orderedBookings = useMemo(
    () => [...bookings]
      .filter((booking) => tab === "all" || (tab === "upcoming" ? ["pending", "awaiting_payment", "confirmed"].includes(booking.status) : tab === "active" ? booking.status === "active" : ["completed", "cancelled", "rejected"].includes(booking.status)))
      .filter((booking) => statusFilter === "all" || booking.status === statusFilter)
      .filter((booking) => !search || `${booking.listingTitle} ${booking.ownerName} ${booking.renterName} ${booking.pickupDate}`.toLowerCase().includes(search.toLowerCase()))
      .sort((left, right) => (right.pickupDate ?? "").localeCompare(left.pickupDate ?? "")),
    [bookings, tab, statusFilter, search],
  );
  const upcomingCount = bookings.filter((booking) => ["pending", "awaiting_payment", "confirmed"].includes(booking.status)).length;
  const activeCount = bookings.filter((booking) => booking.status === "active").length;
  const pastCount = bookings.filter((booking) => ["completed", "cancelled", "rejected"].includes(booking.status)).length;
  const matchingRentals = availableRentals.filter((vehicle) => !search.trim() || `${vehicle.make} ${vehicle.model} ${vehicle.year} ${vehicle.location.city} ${vehicle.location.country}`.toLowerCase().includes(search.trim().toLowerCase()));

  const approve = (booking: RentalBooking) => {
    if (!profile) return;
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true" && booking.id.startsWith("demo-booking-")) { setBookings((items)=>items.map((item)=>item.id===booking.id?{...item,status:"confirmed"}:item)); toast.success("Booking approved."); return; }
    void (async () => {
      try {
        await approveBooking(booking.id, profile.id);
        toast.success("Booking approved.");
        await loadBookings();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Booking could not be approved.");
      }
    })();
  };

  const reject = (booking: RentalBooking) => {
    const reason = window.prompt("Reason for rejecting this booking:");
    if (!reason?.trim()) {
      return;
    }

    if (!profile) return;
    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true" && booking.id.startsWith("demo-booking-")) { setBookings((items)=>items.map((item)=>item.id===booking.id?{...item,status:"rejected",rejectionReason:reason.trim()}:item)); toast.success("Booking declined."); return; }
    void (async () => {
      try {
        await rejectBooking(booking.id, profile.id, reason.trim());
        toast.success("Booking rejected.");
        await loadBookings();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Booking could not be rejected.");
      }
    })();
  };

  const cancel = (booking: RentalBooking) => {
    if (!profile) return;
    void (async () => {
      try {
        await cancelBooking(booking.id, profile.id);
        toast.success("Booking cancelled.");
        await loadBookings();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Booking could not be cancelled.");
      }
    })();
  };

  return (
    <DashboardShell role="personal"><section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#718179]">Home <span className="mx-2">›</span> Bookings</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">{isSeller ? "Bookings" : "Your bookings"}</h1>
            <p className="mt-2 text-[#73827B]">{isSeller ? "Keep every pickup, handoff, and return running smoothly." : "Manage your upcoming trips, pickups, and vehicle reservations."}</p>
          </div>

          {isSeller ? <Link
            href="/dashboard/seller/rentals"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#07543D] px-5 py-3 font-semibold text-white"
          >
            <CalendarDays size={18} />
            Rental management
          </Link> : <button type="button" onClick={() => setShowRentals((shown) => !shown)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#07543D] px-5 py-3 font-semibold text-white"><CalendarDays size={18}/>{showRentals ? "Hide available vehicles" : "Browse vehicles"}</button>}
        </div>

        <div className="grid gap-3 sm:grid-cols-3"><BookingMetric label="Upcoming" value={upcomingCount}/><BookingMetric label="Active now" value={activeCount}/><BookingMetric label="Past bookings" value={pastCount}/></div>
        <div className="flex flex-col gap-3 rounded-2xl border border-[#E5ECE8] bg-white p-4 xl:flex-row xl:items-center"><div className="flex w-fit rounded-xl border border-[#E4EBE7] p-1">{[["upcoming","Upcoming",upcomingCount],["active","Active",activeCount],["past","Past bookings",pastCount],["all","All",bookings.length]].map(([key,label,count])=><button key={key} onClick={()=>setTab(String(key))} className={`rounded-lg px-3 py-2 text-sm font-bold ${tab===key?"bg-[#07543D] text-white":"text-[#687970]"}`}>{label} ({count})</button>)}</div><div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3 text-[#718179]" size={18}/><input className="h-11 w-full rounded-xl border border-[#E1E9E4] bg-white pl-10 pr-3 text-sm outline-none" placeholder={isSeller ? "Search bookings" : "Search bookings or rental vehicles"} value={search} onChange={(e)=>{setSearch(e.target.value); if (!isSeller && e.target.value.trim()) setShowRentals(true);}}/></div><div className="flex items-center gap-2"><SlidersHorizontal size={17} className="text-[#07543D]"/><select aria-label="Filter booking status" className="h-11 rounded-xl border border-[#E1E9E4] bg-white px-3 text-sm" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)}><option value="all">All statuses</option>{["pending","awaiting_payment","confirmed","active","completed","cancelled","rejected"].map((s)=><option key={s} value={s}>{s.replace("_"," ")}</option>)}</select></div></div>
        {!isSeller && showRentals && <section className="rounded-2xl border border-[#E5ECE8] bg-white p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">Available rental vehicles</h2><p className="mt-1 text-sm text-[#718179]">Browse and book without leaving your bookings page.</p></div><span className="text-sm text-[#718179]">{matchingRentals.length} available</span></div>{matchingRentals.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{matchingRentals.map((vehicle)=><article key={vehicle.id} className="overflow-hidden rounded-xl border border-[#E4EBE7]"><div className="relative h-44"><Image src={vehicle.coverImage} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} fill sizes="(max-width:768px) 100vw, 33vw" className="object-cover"/></div><div className="p-4"><h3 className="font-black">{vehicle.year} {vehicle.make} {vehicle.model}</h3><p className="mt-1 text-sm text-[#718179]">{vehicle.location.city}, {vehicle.location.country}</p><p className="mt-3 font-black">{vehicle.currency} {vehicle.price.toLocaleString()} / {vehicle.priceLabel ?? "day"}</p><Link href={`/bookings/new?vehicle=${encodeURIComponent(vehicle.id)}`} className="mt-4 inline-flex rounded-full bg-[#07543D] px-4 py-2 text-sm font-bold text-white">Book this vehicle</Link></div></article>)}</div> : <p className="mt-4 rounded-xl bg-[#F6F9F7] p-4 text-sm text-[#718179]">No available rentals match “{search}”.</p>}</section>}
        {loading ? (
          <div className="flex min-h-72 items-center justify-center">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
          </div>
        ) : orderedBookings.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center">
            <h2 className="text-2xl font-bold">No bookings yet</h2>
            <p className="mt-2 text-gray-500">
              Book a rental vehicle to start tracking requests and payments.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {orderedBookings.map((booking) => {
              const isOwner = booking.ownerId === profile?.id;
              const isRenter = booking.renterId === profile?.id;

              return (
                <article
                  key={booking.id}
                  className="grid gap-5 rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm md:grid-cols-[180px_1fr_auto]"
                >
                  <div className="relative h-40 overflow-hidden rounded-2xl">
                    <Image
                      src={booking.listingImage}
                      alt={booking.listingTitle}
                      fill
                      className="object-cover"
                      sizes="180px"
                    />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold">{booking.listingTitle}</h2>
                      <BookingStatusBadge status={booking.status} />
                    </div>

                    <p className="mt-3 text-sm text-gray-500">
                      {booking.pickupDate} to {booking.returnDate}
                    </p>

                    <p className="mt-2 font-semibold">{booking.totalDays} days</p>
                    <p className="mt-2 text-2xl font-bold text-[#0B5D3B]">
                      {booking.currency} {booking.totalAmount.toFixed(2)}
                    </p>

                    <p className="mt-3 text-sm text-gray-500">
                      {isOwner ? `Requested by ${booking.renterName}` : `Owned by ${booking.ownerName}`}
                    </p>
                  </div>

                  <div className="flex flex-row gap-2 md:flex-col">
                    {isRenter && booking.status === "awaiting_payment" && (
                      <Link
                        href={`/checkout/${booking.id}`}
                        className="rounded-xl bg-[#E7B319] px-5 py-3 text-center text-sm font-bold text-[#17201D]"
                      >
                        Complete payment
                      </Link>
                    )}
                    <button type="button" onClick={()=>setDetailsBooking(booking)} className="rounded-full border border-[#E5E7EB] px-5 py-3 text-center text-sm font-semibold">View details</button>

                    {isOwner && booking.status === "pending" && (
                      <>
                        <button
                          type="button"
                          onClick={() => approve(booking)}
                          className="flex items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-5 py-3 text-sm font-bold text-white"
                        >
                          <Check size={17} />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => reject(booking)}
                          className="flex items-center justify-center gap-2 rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-600"
                        >
                          <X size={17} />
                          Reject
                        </button>
                      </>
                    )}

                    {isRenter && booking.status !== "completed" && booking.status !== "cancelled" && (
                      <button
                        type="button"
                        onClick={() => cancel(booking)}
                        className="flex items-center justify-center gap-2 rounded-full border border-[#E5E7EB] px-5 py-3 text-sm font-semibold text-gray-700"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>{detailsBooking&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4" onMouseDown={(event)=>{if(event.target===event.currentTarget)setDetailsBooking(null);}}><section role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#07543D]">Booking details</p><h2 className="mt-1 text-2xl font-black">{detailsBooking.listingTitle}</h2></div><button onClick={()=>setDetailsBooking(null)} aria-label="Close booking details" className="rounded-full border p-2"><X size={19}/></button></div><div className="relative mt-5 h-56 overflow-hidden rounded-2xl"><Image src={detailsBooking.listingImage} alt={detailsBooking.listingTitle} fill className="object-cover" sizes="(max-width:640px) 100vw,560px"/></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><BookingDetail label="Status" value={detailsBooking.status.replaceAll("_"," ")}/><BookingDetail label="Dates" value={`${detailsBooking.pickupDate} to ${detailsBooking.returnDate}`}/><BookingDetail label="Duration" value={`${detailsBooking.totalDays} days`}/><BookingDetail label="Total" value={`${detailsBooking.currency} ${detailsBooking.totalAmount.toFixed(2)}`}/><BookingDetail label={isSeller?"Renter":"Owner"} value={isSeller?detailsBooking.renterName:detailsBooking.ownerName}/><BookingDetail label="Payment" value={detailsBooking.paymentStatus.replaceAll("_"," ")}/></div>{detailsBooking.renterMessage&&<p className="mt-4 rounded-xl bg-[#F6F9F7] p-4 text-sm leading-6">{detailsBooking.renterMessage}</p>}</section></div>}</DashboardShell>
  );
}

function BookingDetail({label,value}:{label:string;value:string}) { return <div className="rounded-xl bg-[#F6F9F7] p-3"><p className="text-xs text-gray-500">{label}</p><p className="mt-1 font-bold capitalize">{value}</p></div>; }

function BookingMetric({label,value}:{label:string;value:number}) { return <div className="flex items-center gap-4 rounded-2xl border border-[#E5ECE8] bg-white p-4"><span className="rounded-xl bg-[#EAF5EF] p-3 text-[#07543D]"><CalendarDays size={20}/></span><div><p className="text-sm text-[#718179]">{label}</p><p className="text-2xl font-black">{value}</p><p className="text-xs text-[#718179]">Reservations</p></div></div>; }
