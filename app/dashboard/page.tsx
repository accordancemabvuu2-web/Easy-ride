"use client";

import Footer from "@/Components/Footer";
import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import {
  deleteListing,
  getMyListings,
  updateListingStatus,
} from "@/services/listingService";
import type { Vehicle } from "@/Types/vehicle";
import { Eye, Loader2, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}

function DashboardContent() {
  const { profile } = useAuth();
  const [listings, setListings] = useState<Vehicle[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);

  const loadListings = useCallback(async () => {
    if (!profile) return;
    try {
      setLoadingListings(true);
      setListings(await getMyListings(profile.id));
    } catch {
      toast.error("Your listings could not be loaded.");
    } finally {
      setLoadingListings(false);
    }
  }, [profile]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadListings();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadListings]);

  const stats = useMemo(
    () => ({
      total: listings.length,
      active: listings.filter((listing) => listing.status === "active").length,
      pending: listings.filter((listing) => listing.status === "pending").length,
    }),
    [listings]
  );

  const removeListing = async (listing: Vehicle) => {
    if (!window.confirm("Delete this listing?")) {
      return;
    }

    try {
      await deleteListing(listing.id);
      toast.success("Listing deleted.");
      await loadListings();
    } catch {
      toast.error("Listing could not be deleted.");
    }
  };

  const markSold = async (listing: Vehicle) => {
    try {
      await updateListingStatus(listing.id, listing.listingType === "buy" ? "sold" : "rented");
      toast.success("Listing updated.");
      await loadListings();
    } catch {
      toast.error("Status could not be updated.");
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
              Seller dashboard
            </p>
            <h1 className="mt-2 text-4xl font-bold">Manage your listings</h1>
            <p className="mt-3 text-gray-500">
              Review submission status, update sold listings, and delete items you no longer want to show.
            </p>
          </div>

          <Link
            href="/create-listing"
            className="flex items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white"
          >
            <Plus size={19} />
            New Listing
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <DashboardMetric label="Total listings" value={stats.total} />
          <DashboardMetric label="Active" value={stats.active} />
          <DashboardMetric label="Pending" value={stats.pending} />
        </div>

        {loadingListings ? (
          <div className="flex min-h-72 items-center justify-center">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
          </div>
        ) : listings.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center">
            <h2 className="text-2xl font-bold">You have no vehicle listings</h2>
            <p className="mt-2 text-gray-500">
              Create your first listing to start receiving interest.
            </p>

            <Link
              href="/create-listing"
              className="mt-6 inline-flex rounded-full bg-[#0B5D3B] px-6 py-3 font-bold text-white"
            >
              Post a Vehicle
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {listings.map((listing) => (
              <article
                key={listing.id}
                className="grid gap-5 rounded-3xl border border-[#E5E7EB] bg-white p-4 sm:grid-cols-[180px_1fr_auto]"
              >
                <div className="relative h-36 overflow-hidden rounded-2xl">
                  <Image
                    src={listing.coverImage}
                    alt={`${listing.make} ${listing.model}`}
                    fill
                    className="object-cover"
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold">
                      {listing.make} {listing.model} {listing.year}
                    </h2>

                    <StatusBadge status={listing.status} />
                  </div>

                  <p className="mt-2 text-2xl font-bold text-[#0B5D3B]">
                    {listing.currency} {listing.price.toLocaleString()}
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    {listing.location.city}, {listing.location.country}
                  </p>

                  {listing.rejectionReason && (
                    <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                      Reason: {listing.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="flex flex-row gap-2 sm:flex-col">
                  {listing.status === "pending" && (
                    <span className="rounded-full border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700">
                      Awaiting approval
                    </span>
                  )}

                  {(listing.status === "active" || listing.status === "pending") && (
                    <>
                      <Link
                        href={`/vehicle/${listing.id}`}
                        className="flex items-center justify-center gap-2 rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold"
                      >
                        <Eye size={17} />
                        View
                      </Link>

                      <button
                        type="button"
                        onClick={() => void markSold(listing)}
                        className="rounded-full border border-[#0B5D3B] px-4 py-2 text-sm font-semibold text-[#0B5D3B]"
                      >
                        Mark {listing.listingType === "buy" ? "Sold" : "Rented"}
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => void removeListing(listing)}
                    className="flex items-center justify-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
                  >
                    <Trash2 size={17} />
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}

function DashboardMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Vehicle["status"] }) {
  const styles: Record<Vehicle["status"], string> = {
    draft: "bg-gray-100 text-gray-700",
    pending: "bg-amber-100 text-amber-800",
    active: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-700",
    sold: "bg-blue-100 text-blue-700",
    rented: "bg-purple-100 text-purple-700",
    suspended: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}
