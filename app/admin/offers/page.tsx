"use client";

import { ShieldCheck } from "lucide-react";

export default function AdminOffersPage() {
  return (
    <section className="mx-auto w-full max-w-[1180px]">
      <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800">Offers</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Offer oversight is unavailable</h1>
        <p className="mt-3 max-w-2xl text-gray-600">
          The backend exposes offer records only to the participating buyer and seller. This administrator view
          has no authorized platform-wide offers endpoint, so no local or demo offer records are displayed.
        </p>
        <p className="mt-5 flex items-start gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          <ShieldCheck className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
          <span>Offer decisions remain between the buyer and seller. This screen cannot read or change their offers.</span>
        </p>
      </div>
    </section>
  );
}
