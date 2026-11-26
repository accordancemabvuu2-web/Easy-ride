"use client";

import { Banknote, ShieldCheck } from "lucide-react";

export default function AdminPaymentsPage() {
  return (
    <section className="mx-auto w-full max-w-[1180px]">
      <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-900">
          <Banknote size={23} aria-hidden="true" />
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-amber-800">
          Payments
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Payment monitoring is unavailable</h1>
        <p className="mt-3 max-w-2xl text-gray-600">
          A payment provider is not connected to this application. There are no live payment
          transactions to monitor here, and browser-local demo records are not shown as marketplace data.
        </p>
        <p className="mt-5 flex items-start gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          <ShieldCheck className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
          <span>Online booking checkout and paid promotions remain unavailable; this page cannot initiate or confirm a payment.</span>
        </p>
      </div>
    </section>
  );
}
