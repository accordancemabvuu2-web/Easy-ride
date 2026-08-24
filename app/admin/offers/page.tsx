"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import { getAllOffers } from "@/services/offerService";
import type { VehicleOffer } from "@/Types/offer";
import { Loader2, Handshake, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<VehicleOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | VehicleOffer["status"]>("all");

  useEffect(() => {
    void (async () => {
      try {
        setOffers(await getAllOffers());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredOffers = useMemo(() => {
    const term = query.trim().toLowerCase();
    return offers.filter((offer) => {
      const matchesStatus = statusFilter === "all" || offer.status === statusFilter;
      const matchesQuery =
        !term ||
        [
          offer.listingTitle,
          offer.buyerName,
          offer.sellerName,
          offer.currency,
          String(offer.offeredPrice),
          String(offer.askingPrice),
          offer.status,
        ].some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesQuery;
    });
  }, [offers, query, statusFilter]);

  return (
    <section className="min-h-screen px-4 py-8 sm:px-6 lg:px-8 lg:pl-8">
      <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center gap-3">
            <Handshake className="text-[#0B5D3B]" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">Offers</p>
              <h1 className="text-4xl font-bold">Purchase offer monitoring</h1>
            </div>
          </div>

          <div className="mb-5 grid gap-3 rounded-3xl bg-white p-4 shadow-sm sm:grid-cols-[1fr_180px]">
            <label className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] px-4 py-3">
              <Search className="text-gray-400" size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search offers by listing, buyer, or seller"
                className="w-full bg-transparent text-sm outline-none"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm outline-none"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="countered">Countered</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="completed">Completed</option>
            </select>
          </div>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
          </div>
        ) : offers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center">
            <h2 className="text-2xl font-bold">No offers found</h2>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOffers.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center">
                <h2 className="text-2xl font-bold">No offers found</h2>
              </div>
            ) : filteredOffers.map((offer) => (
              <article key={offer.id} className="grid gap-5 rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm lg:grid-cols-[180px_1fr]">
                <div className="relative h-40 overflow-hidden rounded-2xl bg-gray-100">
                  <Image src={offer.listingImage} alt={offer.listingTitle} fill className="object-cover" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold">{offer.listingTitle}</h2>
                    <AdminStatusBadge status={offer.status} />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Buyer: {offer.buyerName} | Seller: {offer.sellerName}
                  </p>
                  <p className="mt-3 text-2xl font-bold text-[#0B5D3B]">
                    {offer.currency} {offer.offeredPrice.toLocaleString()}
                  </p>
                  <p className="mt-2 text-sm text-gray-600">
                    Asking: {offer.currency} {offer.askingPrice.toLocaleString()}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    <Link href={`/vehicle/${offer.listingId}`} className="rounded-full border border-[#E5E7EB] px-4 py-2 font-semibold">
                      Open listing
                    </Link>
                    <Link href="/offers" className="rounded-full border border-[#E5E7EB] px-4 py-2 font-semibold">
                      Open offers
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
