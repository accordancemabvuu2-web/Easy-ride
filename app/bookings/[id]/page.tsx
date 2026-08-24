"use client";

import BookingStatusBadge from "@/Components/BookingStatusBadge";
import BookingTimeline from "@/Components/BookingTimeline";
import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import PaymentSummary from "@/Components/PaymentSummary";
import RequireAuth from "@/Components/RequireAuth";
import ReviewForm from "@/Components/ReviewForm";
import { useAuth } from "@/contexts/AuthContext";
import {
  activateBooking,
  approveBooking,
  completeBooking,
  getBookingById,
  rejectBooking,
} from "@/services/bookingService";
import type { RentalBooking } from "@/Types/booking";
import { Check, Clock3, Loader2, ReceiptText, ShieldCheck, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function BookingDetailPage() {
  return (
    <RequireAuth>
      <BookingDetailContent />
    </RequireAuth>
  );
}

function BookingDetailContent() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [booking, setBooking] = useState<RentalBooking | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBooking = useCallback(async () => {
    setLoading(true);
    try {
      setBooking(await getBookingById(id));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
        </div>
        <Footer />
      </main>
    );
  }

  if (!booking) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
        <Navbar />
        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-3xl font-bold">Booking unavailable</h1>
          <p className="mt-3 text-gray-500">We could not find this booking.</p>
          <Link href="/bookings" className="mt-6 inline-flex rounded-full bg-[#0B5D3B] px-6 py-3 font-semibold text-white">
            Back to bookings
          </Link>
        </section>
        <Footer />
      </main>
    );
  }

  const isOwner = booking.ownerId === profile?.id;
  const isRenter = booking.renterId === profile?.id;
  const canView = isOwner || isRenter || profile?.role === "admin";
  const canAct = isOwner || isRenter;

  if (!canView) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
        <Navbar />
        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-3xl font-bold">Booking unavailable</h1>
          <p className="mt-3 text-gray-500">
            You do not have permission to view this booking.
          </p>
          <Link
            href="/bookings"
            className="mt-6 inline-flex rounded-full bg-[#0B5D3B] px-6 py-3 font-semibold text-white"
          >
            Back to bookings
          </Link>
        </section>
        <Footer />
      </main>
    );
  }

  const approve = () => {
    if (!profile) return;
    void (async () => {
      try {
        await approveBooking(booking.id, profile.id);
        toast.success("Booking approved.");
        await loadBooking();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Booking could not be approved.");
      }
    })();
  };

  const reject = () => {
    const reason = window.prompt("Reason for rejecting this booking:");
    if (!reason?.trim()) return;

    if (!profile) return;
    void (async () => {
      try {
        await rejectBooking(booking.id, profile.id, reason.trim());
        toast.success("Booking rejected.");
        await loadBooking();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Booking could not be rejected.");
      }
    })();
  };

  const activate = () => {
    void (async () => {
      try {
        await activateBooking(booking.id, profile?.id);
        toast.success("Booking is now active.");
        await loadBooking();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Booking could not be updated.");
      }
    })();
  };

  const complete = () => {
    void (async () => {
      try {
        await completeBooking(booking.id, profile?.id);
        toast.success("Booking completed.");
        await loadBooking();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Booking could not be completed.");
      }
    })();
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <Link href="/bookings" className="text-sm font-semibold text-[#0B5D3B] hover:underline">
          Back to bookings
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="overflow-hidden rounded-[32px] border border-[#E5E7EB] bg-white">
              <div className="relative h-72 sm:h-96">
                <Image
                  src={booking.listingImage}
                  alt={booking.listingTitle}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                />
              </div>

              <div className="p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold">{booking.listingTitle}</h1>
                  <BookingStatusBadge status={booking.status} />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-2">
                    <Clock3 size={16} />
                    {booking.pickupDate} to {booking.returnDate}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck size={16} />
                    {isOwner ? `Renter: ${booking.renterName}` : `Owner: ${booking.ownerName}`}
                  </span>
                </div>
              </div>
            </div>

            <BookingTimeline status={booking.status} />

            {booking.status === "completed" && canAct && (
              <ReviewForm
                listing={{
                  id: booking.listingId,
                  ownerId: booking.ownerId,
                  ownerName: booking.ownerName,
                  ownerPhone: booking.renterPhone,
                  ownerEmail: booking.renterEmail,
                  listingType: "rent",
                  status: "active",
                  make: booking.listingTitle.split(" ")[0] ?? "Vehicle",
                  model: booking.listingTitle.split(" ").slice(1, 2).join(" ") || "",
                  year: Number(booking.listingTitle.split(" ").at(-1) ?? new Date().getFullYear()),
                  price: booking.dailyRate,
                  currency: booking.currency,
                  transmission: "Automatic",
                  fuelType: "Petrol",
                  mileage: 0,
                  condition: "Good",
                  description: booking.listingTitle,
                  location: {
                    address: "",
                    city: "",
                    country: "",
                    latitude: 0,
                    longitude: 0,
                  },
                  images: [booking.listingImage],
                  coverImage: booking.listingImage,
                  sellerType: "Private Seller",
                  verified: false,
                  featured: false,
                  views: 0,
                  favoritesCount: 0,
                  createdAt: "",
                  updatedAt: "",
                }}
                bookingId={booking.id}
                reviewedUserId={isOwner ? booking.renterId : booking.ownerId}
              />
            )}
          </div>

          <aside className="space-y-6">
            <PaymentSummary booking={booking} />

            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Actions</h2>

              <div className="mt-4 space-y-3">
                {isOwner && booking.status === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={approve}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white"
                    >
                      <Check size={18} />
                      Approve booking
                    </button>
                    <button
                      type="button"
                      onClick={reject}
                      className="flex w-full items-center justify-center gap-2 rounded-full border border-red-200 px-6 py-4 font-bold text-red-600"
                    >
                      <X size={18} />
                      Reject booking
                    </button>
                  </>
                )}

                {isRenter && booking.status === "awaiting_payment" && (
                  <Link
                    href={`/checkout/${booking.id}`}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white"
                  >
                    <ReceiptText size={18} />
                    Go to checkout
                  </Link>
                )}

                {canAct && booking.status === "confirmed" && (
                  <button
                    type="button"
                    onClick={activate}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-[#0B5D3B] px-6 py-4 font-bold text-[#0B5D3B]"
                  >
                    Mark as active
                  </button>
                )}

                {canAct && booking.status === "active" && (
                  <button
                    type="button"
                    onClick={complete}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white"
                  >
                    Complete booking
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Contact details</h2>
              <div className="mt-4 space-y-3 text-sm">
                <p>
                  <span className="font-semibold text-gray-500">Renter:</span> {booking.renterName}
                </p>
                <p>
                  <span className="font-semibold text-gray-500">Phone:</span> {booking.renterPhone || "Not shared"}
                </p>
                <p>
                  <span className="font-semibold text-gray-500">Email:</span> {booking.renterEmail}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
      <Footer />
    </main>
  );
}
