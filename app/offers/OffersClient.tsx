"use client";

import Navbar from "@/Components/Navbar";
import OfferStatusBadge from "@/Components/OfferStatusBadge";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { acceptOffer, getUserOffers, rejectOffer, withdrawOffer } from "@/lib/clientFirebaseServices";
import type { VehicleOffer } from "@/Types/offer";
import { BadgeDollarSign, Check, Loader2, RefreshCw, ShoppingBag, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function OffersPage() {
  return (
    <RequireAuth>
      <OffersContent />
    </RequireAuth>
  );
}

function OffersContent() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const [offers, setOffers] = useState<VehicleOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadOffers = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setLoadError(null);
    try {
      setOffers(await getUserOffers(profile.id));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Offers could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  const orderedOffers = useMemo(
    () => [...offers].sort((left, right) =>
      (right.createdAt ?? "").localeCompare(left.createdAt ?? ""),
    ),
    [offers],
  );

  const runAction = async (offer: VehicleOffer, action: () => Promise<void>, message: string) => {
    try {
      setUpdatingId(offer.id);
      await action();
      toast.success(message);
      await loadOffers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The offer could not be updated.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <main className="min-h-screen w-full bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section className="mx-auto w-full max-w-[1400px] px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">Marketplace</p>
            <h1 className="mt-2 flex items-center gap-3 text-4xl font-bold">
              <BadgeDollarSign className="text-[#0B5D3B]" aria-hidden="true" />
              Vehicle offers
            </h1>
            <p className="mt-3 text-gray-600">Track offers you have sent or received.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadOffers()}
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-gray-300 px-4 text-sm font-semibold disabled:opacity-60"
          >
            <RefreshCw size={15} aria-hidden="true" className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </header>

        {loadError ? (
          <div role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {loadError}
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-80 items-center justify-center" role="status" aria-label="Loading offers">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={34} aria-hidden="true" />
          </div>
        ) : orderedOffers.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-14 text-center">
            <ShoppingBag className="mx-auto text-gray-400" size={40} aria-hidden="true" />
            <h2 className="mt-5 text-2xl font-bold">No offers yet</h2>
            <p className="mt-2 text-gray-600">Offers you submit or receive will appear here.</p>
            <Link href="/marketplace" className="mt-6 inline-flex rounded-full bg-[#0B5D3B] px-6 py-3 font-semibold text-white">
              Browse listings
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {orderedOffers.map((offer) => {
              const isSeller = profile?.id === offer.sellerId;
              const isBuyer = profile?.id === offer.buyerId;
              const busy = updatingId === offer.id;
              const highlighted = highlightId === offer.id;
              return (
                <article
                  key={offer.id}
                  className={"grid gap-5 rounded-3xl border bg-white p-5 shadow-sm md:grid-cols-[180px_1fr_auto] " +
                    (highlighted ? "border-[#C9A227] ring-2 ring-[#C9A227]/30" : "border-[#E5E7EB]")}
                >
                  <div className="relative h-40 overflow-hidden rounded-2xl bg-gray-100">
                    <Image
                      src={offer.listingImage || "/images/easy-ride-hero.svg"}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold">{offer.listingTitle}</h2>
                      <OfferStatusBadge status={offer.status} />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <PriceItem label="Asking price" value={offer.askingPrice} currency={offer.currency} />
                      <PriceItem label="Offer amount" value={offer.offeredPrice} currency={offer.currency} />
                    </div>
                    <p className="mt-4 text-sm text-gray-600">
                      {isSeller ? "From a buyer" : isBuyer ? "Sent to a seller" : "Offer"}
                      {offer.createdAt ? " · " + new Date(offer.createdAt).toLocaleDateString() : ""}
                    </p>
                    {offer.buyerMessage ? (
                      <div className="mt-3 rounded-2xl bg-[#F8F9FA] p-4 text-sm">
                        <p className="font-semibold">Buyer message</p>
                        <p className="mt-2 whitespace-pre-wrap leading-6 text-gray-700">{offer.buyerMessage}</p>
                      </div>
                    ) : null}
                    {offer.status === "accepted" ? (
                      <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                        Acceptance records interest only. Sale completion, payment, and ownership transfer are not handled here.
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-row flex-wrap gap-2 md:flex-col md:items-stretch">
                    <Link
                      href={"/vehicle/" + encodeURIComponent(offer.listingId)}
                      className="rounded-full border border-[#E5E7EB] px-5 py-3 text-center text-sm font-semibold"
                    >
                      View listing
                    </Link>
                    {isSeller && offer.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void runAction(offer, () => acceptOffer(offer, profile.id), "Offer accepted.")}
                          className="flex items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                        >
                          <Check size={17} aria-hidden="true" /> Accept
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void runAction(offer, () => rejectOffer(offer, profile.id), "Offer rejected.")}
                          className="flex items-center justify-center gap-2 rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-600 disabled:opacity-60"
                        >
                          <X size={17} aria-hidden="true" /> Reject
                        </button>
                      </>
                    ) : null}
                    {isBuyer && offer.status === "pending" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void runAction(offer, () => withdrawOffer(offer, profile.id), "Offer withdrawn.")}
                        className="rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-600 disabled:opacity-60"
                      >
                        Withdraw
                      </button>
                    ) : null}
                    {busy ? <Loader2 className="animate-spin text-[#0B5D3B]" size={21} aria-label="Updating offer" /> : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function PriceItem({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <div className="rounded-2xl bg-[#F8F9FA] p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 font-bold">{currency} {value.toLocaleString()}</p>
    </div>
  );
}
