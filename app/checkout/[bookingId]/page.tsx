"use client";

import Navbar from "@/Components/Navbar";
import PaymentSummary from "@/Components/PaymentSummary";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { getBookingById } from "@/services/bookingService";
import { getListingById } from "@/services/listingService";
import { completeMockPayment, createBookingPayment } from "@/services/paymentService";
import type { RentalBooking } from "@/Types/booking";
import type { Vehicle } from "@/Types/vehicle";
import { ArrowLeft, Check, CreditCard, Loader2, Lock, MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
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

  if (searchParams.get("type") === "purchase" || searchParams.get("type") === "rental") {
    return <DemoCheckout listingId={bookingId} type={searchParams.get("type") === "rental" ? "rental" : "purchase"} startDate={searchParams.get("start") ?? ""} endDate={searchParams.get("end") ?? ""} />;
  }

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

function DemoCheckout({
  listingId,
  type,
  startDate,
  endDate,
}: {
  listingId: string;
  type: "purchase" | "rental";
  startDate: string;
  endDate: string;
}) {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    void getListingById(listingId).then(setVehicle);
  }, [listingId]);

  const rentalDays = startDate && endDate
    ? Math.max(0, Math.ceil((new Date(`${endDate}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const subtotal = vehicle ? type === "purchase" ? vehicle.price : rentalDays * vehicle.price : 0;
  const serviceFee = Math.round(subtotal * (type === "purchase" ? 0.01 : 0.05) * 100) / 100;
  const total = subtotal + serviceFee;

  if (!vehicle) {
    return <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]"><Loader2 className="animate-spin text-[#0B5D3B]" size={32} /></main>;
  }

  if (success) {
    return <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA] px-5 text-[#202124]"><div className="w-full max-w-xl rounded-3xl border border-[#E5E7EB] bg-white p-8 text-center"><Check className="mx-auto rounded-full bg-green-50 p-3 text-green-700" size={64} /><p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">Payment successful</p><h1 className="mt-2 text-3xl font-bold">{type === "purchase" ? "Your vehicle purchase is confirmed." : "Your rental is confirmed."}</h1><p className="mt-4 text-gray-500">This demo payment has been recorded and is ready to connect to the production payment provider.</p><div className="mt-7 flex items-center gap-4 rounded-2xl bg-[#F8F9FA] p-4 text-left"><img src={vehicle.coverImage} alt="" className="h-20 w-28 rounded-xl object-cover" /><div><p className="font-bold">{vehicle.year} {vehicle.make} {vehicle.model}</p><p className="mt-1 text-sm text-gray-500">{vehicle.currency} {total.toLocaleString()}</p></div></div><button type="button" onClick={() => router.push("/dashboard")} className="mt-7 w-full rounded-full bg-[#0B5D3B] px-5 py-4 font-bold text-white">Go to my dashboard</button></div></main>;
  }

  return <main className="min-h-screen bg-[#F8F9FA] text-[#202124]"><header className="border-b border-[#E5E7EB] bg-white"><div className="mx-auto flex max-w-7xl items-center px-5 py-5"><button type="button" onClick={() => router.back()} className="flex items-center gap-2 text-sm font-semibold text-[#0B5D3B]"><ArrowLeft size={18} /> Back</button><div className="mx-auto flex items-center gap-2 text-sm font-semibold"><Lock size={15} className="text-green-700" /> Secure checkout</div><span className="w-12" /></div></header><div className="mx-auto max-w-6xl px-5 py-10"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">Final step</p><h1 className="mt-2 text-4xl font-bold">Complete your payment</h1><p className="mt-3 text-gray-500">Review your order and confirm this demo transaction.</p><div className="mt-10 grid gap-8 lg:grid-cols-[1fr_400px]"><section className="rounded-3xl border border-[#E5E7EB] bg-white p-6"><h2 className="text-xl font-bold">Payment method</h2><div className="mt-6 rounded-2xl border border-[#C9A227] bg-[#C9A227]/5 p-5"><CreditCard className="text-[#0B5D3B]" /><p className="mt-3 font-semibold">Card payment</p><p className="mt-1 text-sm text-gray-500">Demo payment flow ready for provider integration.</p></div><div className="mt-6 space-y-4"><input placeholder="Cardholder name" className="input" /><input placeholder="0000 0000 0000 0000" className="input" /><div className="grid gap-4 sm:grid-cols-2"><input placeholder="MM / YY" className="input" /><input placeholder="CVV" type="password" className="input" /></div></div><div className="mt-6 rounded-2xl bg-green-50 p-4 text-sm text-green-800"><div className="flex items-center gap-2 font-semibold"><ShieldCheck size={18} /> Protected demo transaction</div></div><button type="button" disabled={processing} onClick={async () => { setProcessing(true); await new Promise((resolve) => setTimeout(resolve, 800)); setProcessing(false); setSuccess(true); }} className="mt-6 w-full rounded-full bg-[#0B5D3B] px-5 py-4 font-bold text-white disabled:opacity-60">{processing ? "Processing payment..." : `Pay ${vehicle.currency} ${total.toLocaleString()}`}</button></section><aside className="h-fit rounded-3xl border border-[#E5E7EB] bg-white p-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Order summary</p><div className="mt-5 flex gap-4"><img src={vehicle.coverImage} alt="" className="h-24 w-32 rounded-xl object-cover" /><div><h2 className="font-bold">{vehicle.year} {vehicle.make}</h2><p className="text-sm text-gray-500">{vehicle.model}</p><p className="mt-2 flex items-center gap-1 text-xs text-gray-500"><MapPin size={13} />{vehicle.location.city}</p></div></div><div className="my-6 h-px bg-[#E5E7EB]" /><div className="space-y-4 text-sm"><div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{vehicle.currency} {subtotal.toLocaleString()}</span></div><div className="flex justify-between"><span className="text-gray-500">Easy Ride service fee</span><span>{vehicle.currency} {serviceFee.toLocaleString()}</span></div><div className="flex justify-between border-t border-[#E5E7EB] pt-4 font-bold"><span>Total</span><span className="text-[#0B5D3B]">{vehicle.currency} {total.toLocaleString()}</span></div></div></aside></div></div></main>;
}
