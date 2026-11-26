"use client";

import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

export default function CheckoutClient() {
  return (
    <RequireAuth>
      <CheckoutContent />
    </RequireAuth>
  );
}

function CheckoutContent() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const searchParams = useSearchParams();
  const isVehicleCheckout =
    searchParams.get("type") === "purchase" ||
    searchParams.get("type") === "rental";
  const returnHref = isVehicleCheckout
    ? "/vehicle/" + encodeURIComponent(bookingId)
    : "/bookings/" + encodeURIComponent(bookingId);

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section
        aria-labelledby="checkout-unavailable-title"
        className="mx-auto max-w-2xl px-4 py-16 sm:px-6"
      >
        <div
          aria-live="polite"
          className="rounded-3xl border border-amber-200 bg-white p-7 shadow-sm sm:p-10"
        >
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-amber-800">
            Checkout unavailable
          </p>
          <h1 id="checkout-unavailable-title" className="mt-3 text-3xl font-black">
            Online payments are not active yet
          </h1>
          <p className="mt-4 leading-7 text-gray-600">
            Easy Ride has not connected a payment provider. No payment has been
            taken, and this page cannot confirm a vehicle purchase or rental.
          </p>
          <p className="mt-3 leading-7 text-gray-600">
            Contact the seller to agree on the next steps. Any existing booking
            request keeps its current status.
          </p>
          <Link
            href={returnHref}
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#0B5D3B] px-6 py-3 font-bold text-white transition hover:bg-[#084b30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5D3B]"
          >
            {isVehicleCheckout ? "Return to vehicle" : "Return to booking"}
          </Link>
        </div>
      </section>
    </main>
  );
}
