"use client";

import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { getListingById } from "@/lib/clientFirebaseServices";
import type { Vehicle } from "@/Types/vehicle";
import { Loader2, Megaphone } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PromotePage() {
  return (
    <RequireAuth>
      <PromoteContent />
    </RequireAuth>
  );
}

function PromoteContent() {
  const { listingId } = useParams<{ listingId: string }>();
  const { profile } = useAuth();
  const [listing, setListing] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getListingById(listingId)
      .then((value) => {
        if (active) setListing(value);
      })
      .catch(() => {
        if (active) setListing(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [listingId]);

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {loading ? (
          <div
            aria-label="Loading listing"
            className="flex min-h-64 items-center justify-center"
          >
            <Loader2 className="animate-spin text-[#0B5D3B]" size={30} />
          </div>
        ) : !listing || listing.ownerId !== profile?.id ? (
          <div className="rounded-3xl border border-[#E5E7EB] bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-bold">Promotion unavailable</h1>
            <p className="mt-3 text-gray-600">
              You can only manage promotions for your own listing.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#0B5D3B] px-5 py-2 font-semibold text-white"
            >
              Back to dashboard
            </Link>
          </div>
        ) : (
          <div className="rounded-3xl border border-amber-200 bg-white p-7 shadow-sm sm:p-10">
            <Megaphone className="text-[#0B5D3B]" size={28} />
            <p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-amber-800">
              Paid promotion unavailable
            </p>
            <h1 className="mt-2 text-3xl font-black">
              {listing.year} {listing.make} {listing.model}
            </h1>
            <p className="mt-4 leading-7 text-gray-600">
              Easy Ride has not connected a payment provider or promotion service.
              Your listing has not been changed and no payment has been taken.
            </p>
            <Link
              href={"/vehicle/" + encodeURIComponent(listing.id)}
              className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-[#0B5D3B] px-6 py-3 font-bold text-white transition hover:bg-[#084b30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5D3B]"
            >
              View listing
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
