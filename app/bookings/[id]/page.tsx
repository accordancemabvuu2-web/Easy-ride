"use client";

import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import { CalendarDays, MessageCircle } from "lucide-react";
import Link from "next/link";

export default function BookingDetailsPage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
        <Navbar />
        <section className="mx-auto max-w-3xl px-4 py-16">
          <div className="rounded-3xl border border-amber-200 bg-white p-8 shadow-sm">
            <CalendarDays className="text-amber-800" size={28} aria-hidden="true" />
            <h1 className="mt-5 text-3xl font-bold">Rental booking details are unavailable</h1>
            <p className="mt-3 text-gray-600">
              No reservation or payment confirmation is provided by this page. Contact the seller through an
              enquiry to agree availability and rental terms.
            </p>
            <Link
              href="/marketplace"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0B5D3B] px-5 py-3 font-semibold text-white"
            >
              <MessageCircle size={17} aria-hidden="true" />
              Browse vehicles
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    </RequireAuth>
  );
}
