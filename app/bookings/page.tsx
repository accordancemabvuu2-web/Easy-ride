"use client";

import BookingStatusBadge from "@/Components/BookingStatusBadge";
import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import {
  approveBooking,
  cancelBooking,
  getUserBookings,
  rejectBooking,
} from "@/services/bookingService";
import type { RentalBooking } from "@/Types/booking";
import { CalendarDays, Check, Loader2, X } from "lucide-react";
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
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = useCallback(async () => {
    if (!profile) {
      return;
    }

    setLoading(true);
    try {
      setBookings(await getUserBookings(profile.id));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Bookings could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const orderedBookings = useMemo(
    () => [...bookings].sort((left, right) => (right.createdAt ?? "").localeCompare(left.createdAt ?? "")),
    [bookings],
  );

  const approve = (booking: RentalBooking) => {
    if (!profile) return;
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
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
              Bookings
            </p>
            <h1 className="mt-2 text-4xl font-bold">Your rental requests</h1>
          </div>

          <Link
            href="/marketplace"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[#0B5D3B] px-5 py-3 font-semibold text-[#0B5D3B]"
          >
            <CalendarDays size={18} />
            Browse vehicles
          </Link>
        </div>

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
                  className="grid gap-5 rounded-3xl border border-[#E5E7EB] bg-white p-5 md:grid-cols-[180px_1fr_auto]"
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
                    <Link
                      href={`/bookings/${booking.id}`}
                      className="rounded-full border border-[#E5E7EB] px-5 py-3 text-center text-sm font-semibold"
                    >
                      Details
                    </Link>

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
      </section>
    </main>
  );
}
