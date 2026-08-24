"use client";

import Navbar from "@/Components/Navbar";
import OfferStatusBadge from "@/Components/OfferStatusBadge";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import {
  acceptCounterOffer,
  acceptOffer,
  completeVehicleSale,
  counterOffer,
  getUserOffers,
  rejectOffer,
  withdrawOffer,
} from "@/services/offerService";
import type { VehicleOffer } from "@/Types/offer";
import { BadgeDollarSign, Check, Loader2, Repeat2, ShoppingBag, X } from "lucide-react";
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

  const loadOffers = useCallback(async () => {
    if (!profile) {
      return;
    }

    try {
      setLoading(true);
      setOffers(await getUserOffers(profile.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Offers could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  const orderedOffers = useMemo(
    () =>
      [...offers].sort((left, right) => (right.createdAt ?? "").localeCompare(left.createdAt ?? "")),
    [offers],
  );

  const runAction = async (
    offerId: string,
    action: () => Promise<void>,
    successMessage: string,
  ) => {
    try {
      setUpdatingId(offerId);
      await action();
      toast.success(successMessage);
      await loadOffers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The offer could not be updated.");
    } finally {
      setUpdatingId(null);
    }
  };

  const submitCounter = async (offer: VehicleOffer) => {
    if (!profile) {
      return;
    }

    const amount = window.prompt("Enter your counter-offer amount:", String(offer.askingPrice));
    if (!amount) {
      return;
    }

    const counterPrice = Number(amount);
    if (!Number.isFinite(counterPrice) || counterPrice <= 0) {
      toast.error("Enter a valid counter-offer amount.");
      return;
    }

    const message =
      window.prompt("Add a message for the buyer:", "I can meet you part way on the price.") ?? "";

    await runAction(
      offer.id,
      () => counterOffer(offer, profile.id, counterPrice, message),
      "Counter offer sent.",
    );
  };

  const reject = async (offer: VehicleOffer) => {
    if (!profile) {
      return;
    }

    const message = window.prompt("Add an optional reason for rejecting the offer:") ?? "";
    await runAction(offer.id, () => rejectOffer(offer, profile.id, message), "Offer rejected.");
  };

  const accept = async (offer: VehicleOffer) => {
    if (!profile) {
      return;
    }

    await runAction(offer.id, () => acceptOffer(offer, profile.id), "Offer accepted.");
  };

  const acceptCounter = async (offer: VehicleOffer) => {
    if (!profile) {
      return;
    }

    await runAction(
      offer.id,
      () => acceptCounterOffer(offer, profile.id),
      "Counter offer accepted.",
    );
  };

  const declineCounter = async (offer: VehicleOffer) => {
    if (!profile) {
      return;
    }

    await runAction(offer.id, () => withdrawOffer(offer, profile.id), "Counter declined.");
  };

  const withdraw = async (offer: VehicleOffer) => {
    if (!profile) {
      return;
    }

    await runAction(offer.id, () => withdrawOffer(offer, profile.id), "Offer withdrawn.");
  };

  const complete = async (offer: VehicleOffer) => {
    if (!profile) {
      return;
    }

    await runAction(
      offer.id,
      () => completeVehicleSale(offer.id, profile.id),
      "Vehicle sale completed.",
    );
  };

  return (
    <main className="min-h-screen w-full bg-[#F8F9FA] text-[#202124]">
      <Navbar />

      <section className="mx-auto w-full max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <BadgeDollarSign className="text-[#0B5D3B]" />
          <h1 className="text-4xl font-bold">Vehicle offers</h1>
        </div>

        <p className="mt-3 text-gray-500">Manage purchase offers you have sent or received.</p>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={34} />
          </div>
        ) : orderedOffers.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-14 text-center">
            <ShoppingBag className="mx-auto text-gray-400" size={40} />
            <h2 className="mt-5 text-2xl font-bold">No offers yet</h2>
            <p className="mt-2 text-gray-500">Offers you submit or receive will appear here.</p>
            <Link
              href="/marketplace"
              className="mt-6 inline-flex rounded-full bg-[#0B5D3B] px-6 py-3 font-semibold text-white"
            >
              Browse listings
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {orderedOffers.map((offer) => {
              const isSeller = profile?.id === offer.sellerId;
              const isBuyer = profile?.id === offer.buyerId;
              const busy = updatingId === offer.id;
              const currentPrice = offer.counterPrice ?? offer.offeredPrice;
              const highlighted = highlightId === offer.id;

              return (
                <article
                  key={offer.id}
                  className={`grid gap-5 rounded-3xl border bg-white p-5 shadow-sm md:grid-cols-[190px_1fr_auto] ${
                    highlighted ? "border-[#C9A227] ring-2 ring-[#C9A227]/30" : "border-[#E5E7EB]"
                  }`}
                >
                  <div className="relative h-40 overflow-hidden rounded-2xl bg-gray-100">
                    <Image src={offer.listingImage} alt={offer.listingTitle} fill className="object-cover" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold">{offer.listingTitle}</h2>
                      <OfferStatusBadge status={offer.status} />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <PriceItem
                        label="Asking price"
                        value={`${offer.currency} ${offer.askingPrice.toLocaleString()}`}
                      />
                      <PriceItem
                        label="Buyer offer"
                        value={`${offer.currency} ${offer.offeredPrice.toLocaleString()}`}
                      />
                      <PriceItem
                        label="Current price"
                        value={`${offer.currency} ${currentPrice.toLocaleString()}`}
                      />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <InfoItem
                        label="Buyer"
                        value={`${offer.buyerName} | ${offer.buyerEmail || "No email"}`}
                      />
                      <InfoItem label="Seller" value={offer.sellerName} />
                    </div>

                    {offer.buyerPhone ? (
                      <p className="mt-3 text-sm text-gray-500">Buyer phone: {offer.buyerPhone}</p>
                    ) : null}

                    {offer.buyerMessage ? (
                      <div className="mt-4 rounded-2xl bg-[#F8F9FA] p-4 text-sm">
                        <p className="font-semibold">Buyer message</p>
                        <p className="mt-2 leading-6 text-gray-600">{offer.buyerMessage}</p>
                      </div>
                    ) : null}

                    {offer.sellerMessage ? (
                      <div className="mt-3 rounded-2xl bg-blue-50 p-4 text-sm">
                        <p className="font-semibold text-blue-900">Seller response</p>
                        <p className="mt-2 leading-6 text-blue-700">{offer.sellerMessage}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-row flex-wrap gap-2 md:flex-col md:items-stretch">
                    <Link
                      href={`/vehicle/${offer.listingId}`}
                      className="rounded-full border border-[#E5E7EB] px-5 py-3 text-center text-sm font-semibold"
                    >
                      View listing
                    </Link>

                    {isSeller && offer.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void accept(offer)}
                          className="flex items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                        >
                          <Check size={17} />
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void submitCounter(offer)}
                          className="flex items-center justify-center gap-2 rounded-full border border-[#2563EB] px-5 py-3 text-sm font-bold text-[#2563EB] disabled:opacity-60"
                        >
                          <Repeat2 size={17} />
                          Counter
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void reject(offer)}
                          className="flex items-center justify-center gap-2 rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-600 disabled:opacity-60"
                        >
                          <X size={17} />
                          Reject
                        </button>
                      </>
                    ) : null}

                    {isBuyer && offer.status === "countered" ? (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void acceptCounter(offer)}
                          className="flex items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                        >
                          <Check size={17} />
                          Accept Counter
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void declineCounter(offer)}
                          className="rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-600 disabled:opacity-60"
                        >
                          Decline
                        </button>
                      </>
                    ) : null}

                    {isBuyer && offer.status === "pending" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void withdraw(offer)}
                        className="rounded-full border border-red-200 px-5 py-3 text-sm font-bold text-red-600 disabled:opacity-60"
                      >
                        Withdraw
                      </button>
                    ) : null}

                    {isSeller && offer.status === "accepted" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void complete(offer)}
                        className="rounded-full bg-[#C9A227] px-5 py-3 text-sm font-bold text-[#121212] disabled:opacity-60"
                      >
                        Complete Sale
                      </button>
                    ) : null}

                    {busy ? <Loader2 className="animate-spin text-[#0B5D3B]" size={21} /> : null}
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

function PriceItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#F8F9FA] p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-800">{value}</p>
    </div>
  );
}
