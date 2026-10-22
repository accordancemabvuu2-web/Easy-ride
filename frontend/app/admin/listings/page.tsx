"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import { getAdminListings } from "@/services/adminService";
import { createNotification } from "@/services/notificationService";
import { updateListingStatus } from "@/services/listingService";
import type { Vehicle } from "@/Types/vehicle";
import { Check, Loader2, Search, ShieldCheck, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Vehicle["status"]>("all");

  const load = async () => {
    setLoading(true);
    try {
      setListings(await getAdminListings());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredListings = useMemo(() => {
    const term = query.trim().toLowerCase();
    return listings.filter((listing) => {
      const matchesStatus = statusFilter === "all" || listing.status === statusFilter;
      const matchesQuery =
        !term ||
        [
          listing.make,
          listing.model,
          String(listing.year),
          listing.ownerName,
          listing.ownerPhone,
          listing.location.address,
          listing.location.city,
          listing.status,
          listing.listingType,
        ].some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesQuery;
    });
  }, [listings, query, statusFilter]);

  const approve = async (listing: Vehicle) => {
    try {
      await updateListingStatus(listing.id, "active");
      await createNotification({
        userId: listing.ownerId,
        type: "listing",
        title: "Listing approved",
        message: `${listing.make} ${listing.model} ${listing.year} is now live on Easy Ride.`,
        actionUrl: `/vehicle/${listing.id}`,
        link: `/vehicle/${listing.id}`,
      });
      toast.success("Listing approved.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Listing could not be approved.");
    }
  };

  const reject = async (listing: Vehicle) => {
    const reason = window.prompt("Enter the reason for rejecting this listing:");
    if (!reason?.trim()) return;

    try {
      await updateListingStatus(listing.id, "rejected", reason.trim());
      await createNotification({
        userId: listing.ownerId,
        type: "listing",
        title: "Listing rejected",
        message: `${listing.make} ${listing.model} ${listing.year} was rejected: ${reason.trim()}`,
        actionUrl: "/dashboard",
        link: "/dashboard",
      });
      toast.success("Listing rejected.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Listing could not be rejected.");
    }
  };

  const suspend = async (listing: Vehicle) => {
    try {
      await updateListingStatus(listing.id, "suspended");
      toast.success("Listing suspended.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Listing could not be suspended.");
    }
  };

  return (
    <section className="min-h-screen px-4 py-8 sm:px-6 lg:px-8 lg:pl-8">
      <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center gap-3">
            <ShieldCheck className="text-[#0B5D3B]" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">Listings</p>
              <h1 className="text-4xl font-bold">Marketplace moderation</h1>
            </div>
          </div>

          <div className="mb-5 grid gap-3 rounded-3xl bg-white p-4 shadow-sm sm:grid-cols-[1fr_180px]">
            <label className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] px-4 py-3">
              <Search className="text-gray-400" size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by vehicle, owner, or location"
                className="w-full bg-transparent text-sm outline-none"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="rejected">Rejected</option>
              <option value="sold">Sold</option>
              <option value="rented">Rented</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredListings.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center">
                <h2 className="text-2xl font-bold">No listings found</h2>
              </div>
            ) : (
              filteredListings.map((listing) => (
                <article key={listing.id} className="grid gap-5 rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm lg:grid-cols-[220px_1fr_auto]">
                  <div className="relative h-44 overflow-hidden rounded-2xl bg-gray-100">
                    <Image src={listing.coverImage} alt={`${listing.make} ${listing.model}`} fill className="object-cover" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold">
                        {listing.make} {listing.model} {listing.year}
                      </h2>
                      <AdminStatusBadge status={listing.status} />
                    </div>
                    <p className="mt-2 text-2xl font-bold text-[#0B5D3B]">
                      {listing.currency} {listing.price.toLocaleString()}
                    </p>
                    <div className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                      <p><b>Seller:</b> {listing.ownerName}</p>
                      <p><b>Contact:</b> {listing.ownerPhone}</p>
                      <p><b>Location:</b> {listing.location.address}</p>
                      <p><b>Type:</b> {listing.listingType === "buy" ? "For sale" : "For rent"}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 lg:flex-col">
                    <button
                      type="button"
                      onClick={() => void approve(listing)}
                      className="flex items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-5 py-3 font-bold text-white"
                    >
                      <Check size={18} />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void reject(listing)}
                      className="flex items-center justify-center gap-2 rounded-full border border-red-200 px-5 py-3 font-bold text-red-600"
                    >
                      <X size={18} />
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => void suspend(listing)}
                      className="rounded-full border border-[#E5E7EB] px-5 py-3 font-bold text-gray-700"
                    >
                      Suspend
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}
