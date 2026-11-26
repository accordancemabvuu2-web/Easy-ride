"use client";

import { CalendarDays, ShieldCheck } from "lucide-react";

export default function AdminBookingsPage() {
  return (
    <section className="mx-auto w-full max-w-[1180px]">
      <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-900">
          <CalendarDays size={23} aria-hidden="true" />
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-amber-800">Bookings</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Booking operations are unavailable</h1>
        <p className="mt-3 max-w-2xl text-gray-600">
          The backend has no administrator booking queue or approval API. Online booking checkout, seller
          confirmation, and payment settlement are not active, so this screen does not display local demo records
          or offer actions that could not be persisted.
        </p>
        <p className="mt-5 flex items-start gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          <ShieldCheck className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
          <span>Rental requests currently use seller enquiries. Confirm availability and terms directly with the seller.</span>
        </p>
      </div>
    </section>
  );
}
