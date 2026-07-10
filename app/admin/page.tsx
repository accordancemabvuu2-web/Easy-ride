"use client";

import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPendingListings,
  updateListingStatus,
} from "@/services/listingService";
import { createNotification } from "@/services/notificationService";
import type { Vehicle } from "@/Types/vehicle";
import {
  Check,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function AdminPage() {
  return (
    <RequireAuth>
      <AdminContent />
    </RequireAuth>
  );
}

function AdminContent() {
  const { profile } = useAuth();
  const [listings, setListings] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPending = useCallback(async () => {
    try {
      setLoading(true);
      setListings(await getPendingListings());
    } catch {
      toast.error("Pending listings could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile?.role === "admin") {
      void loadPending();
    } else {
      setLoading(false);
    }
  }, [profile, loadPending]);

  const approve = async (listingId: string) => {
    try {
      const listing = listings.find((item) => item.id === listingId);
      await updateListingStatus(listingId, "active");

      if (listing) {
        await createNotification({
          userId: listing.ownerId,
          type: "listing_approved",
          title: "Listing approved",
          message: `${listing.make} ${listing.model} ${listing.year} is now live on Easy Ride.`,
          link: `/vehicle/${listing.id}`,
        });
      }

      toast.success("Listing approved.");
      await loadPending();
    } catch {
      toast.error("Listing could not be approved.");
    }
  };

  const reject = async (listingId: string) => {
    const reason = window.prompt("Enter the reason for rejecting this listing:");

    if (!reason?.trim()) {
      return;
    }

    try {
      const listing = listings.find((item) => item.id === listingId);
      await updateListingStatus(listingId, "rejected", reason.trim());

      if (listing) {
        await createNotification({
          userId: listing.ownerId,
          type: "listing_rejected",
          title: "Listing rejected",
          message: `${listing.make} ${listing.model} ${listing.year} was rejected: ${reason.trim()}`,
          link: `/dashboard`,
        });
      }

      toast.success("Listing rejected.");
      await loadPending();
    } catch {
      toast.error("Listing could not be rejected.");
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      {profile?.role !== "admin" ? (
        <section className="mx-auto max-w-xl px-4 py-20 text-center">
          <ShieldAlert className="mx-auto text-red-600" size={48} />
          <h1 className="mt-5 text-3xl font-bold">Access denied</h1>
          <p className="mt-3 text-gray-500">
            Only Easy Ride administrators can access this page.
          </p>
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
            Moderation
          </p>

          <h1 className="mt-2 text-4xl font-bold">Pending listings</h1>
          <p className="mt-3 text-gray-500">
            Review vehicle information before publishing it.
          </p>

          {loading ? (
            <div className="flex min-h-80 items-center justify-center">
              <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
            </div>
          ) : listings.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center">
              <h2 className="text-2xl font-bold">No listings are waiting</h2>
              <p className="mt-2 text-gray-500">
                Newly submitted vehicles will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-8 space-y-5">
              {listings.map((listing) => (
                <article
                  key={listing.id}
                  className="grid gap-5 rounded-3xl border border-[#E5E7EB] bg-white p-5 lg:grid-cols-[220px_1fr_auto]"
                >
                  <div className="relative h-44 overflow-hidden rounded-2xl">
                    <Image
                      src={listing.coverImage}
                      alt={`${listing.make} ${listing.model}`}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold">
                      {listing.make} {listing.model} {listing.year}
                    </h2>

                    <p className="mt-2 text-2xl font-bold text-[#0B5D3B]">
                      {listing.currency} {listing.price.toLocaleString()}
                    </p>

                    <div className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                      <p>
                        <b>Seller:</b> {listing.ownerName}
                      </p>

                      <p>
                        <b>Contact:</b> {listing.ownerPhone}
                      </p>

                      <p>
                        <b>Location:</b> {listing.location.address}
                      </p>

                      <p>
                        <b>Type:</b>{" "}
                        {listing.listingType === "buy" ? "For sale" : "For rent"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 lg:flex-col">
                    <button
                      type="button"
                      onClick={() => void approve(listing.id)}
                      className="flex items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-5 py-3 font-bold text-white"
                    >
                      <Check size={18} />
                      Approve
                    </button>

                    <button
                      type="button"
                      onClick={() => void reject(listing.id)}
                      className="flex items-center justify-center gap-2 rounded-full border border-red-200 px-5 py-3 font-bold text-red-600"
                    >
                      <X size={18} />
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      <Footer />
    </main>
  );
}
