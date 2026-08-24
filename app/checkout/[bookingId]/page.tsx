"use client";

import Navbar from "@/Components/Navbar";
import PaymentSummary from "@/Components/PaymentSummary";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { getBookingById } from "@/services/bookingService";
import { completeMockPayment, createBookingPayment } from "@/services/paymentService";
import type { RentalBooking } from "@/Types/booking";
import { Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <CheckoutContent />
    </RequireAuth>
  );
}

function CheckoutContent() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const [booking, setBooking] = useState<RentalBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function loadBooking() {
      setLoading(true);
      try {
        setBooking(await getBookingById(bookingId));
      } finally {
        setLoading(false);
      }
    }

    void loadBooking();
  }, [bookingId]);

  const pay = async () => {
    if (!booking || !profile) return;
    try {
      setProcessing(true);
      const paymentId = await createBookingPayment({
        userId: profile.id,
        bookingId: booking.id,
        amount: booking.totalAmount,
        currency: booking.currency,
      });
      await completeMockPayment(paymentId, profile.id);
      toast.success("Mock payment completed.");
      router.push(`/bookings/${booking.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment could not be completed.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
        </div>
      </main>
    );
  }

  if (!booking || booking.renterId !== profile?.id || booking.status !== "awaiting_payment") {
    return (
      <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
        <Navbar />
        <section className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-3xl font-bold">Checkout unavailable</h1>
          <p className="mt-3 text-gray-500">This booking cannot be paid from your account.</p>
          <Link href="/bookings" className="mt-6 inline-flex rounded-full bg-[#0B5D3B] px-6 py-3 font-semibold text-white">
            Back to bookings
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1fr_0.8fr] lg:px-6">
        <div className="rounded-[32px] border border-[#E5E7EB] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-[#0B5D3B]" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
                Checkout
              </p>
              <h1 className="mt-2 text-4xl font-bold">Mock payment provider</h1>
            </div>
          </div>

          <p className="mt-4 text-gray-600">
            This keeps the payment step provider-independent so we can test the flow without connecting live billing.
          </p>

          <button
            type="button"
            onClick={() => void pay()}
            disabled={processing}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white disabled:opacity-60"
          >
            {processing && <Loader2 className="animate-spin" size={18} />}
            Complete mock payment
          </button>
        </div>

        <PaymentSummary booking={booking} />
      </section>
    </main>
  );
}
