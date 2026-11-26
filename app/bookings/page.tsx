"use client";

import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import { CalendarDays, MessageCircle } from "lucide-react";
import Link from "next/link";

export default function BookingsPage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
        <Navbar />
        <section className="mx-auto max-w-3xl px-4 py-16">
          <div className="rounded-3xl border border-amber-200 bg-white p-8 shadow-sm">
            <CalendarDays className="text-amber-800" size={28} aria-hidden="true" />
            <h1 className="mt-5 text-3xl font-bold">Online rental bookings are unavailable</h1>
            <p className="mt-3 text-gray-600">
              This application cannot confirm availability, reserve a vehicle, or process rental payment.
              Rental date selections are sent to the seller as an enquiry only.
            </p>
            <Link
              href="/marketplace"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0B5D3B] px-5 py-3 font-semibold text-white"
            >
              <MessageCircle size={17} aria-hidden="true" />
              Browse vehicles and contact a seller
            </Link>
          </div>
        </section>
        <Footer />
      </main>
    </RequireAuth>
  );
}
