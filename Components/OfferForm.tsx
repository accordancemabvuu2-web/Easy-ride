"use client";

import { useAuth } from "@/contexts/AuthContext";
import { createVehicleOffer } from "@/services/offerService";
import type { Vehicle } from "@/Types/vehicle";
import { BadgeDollarSign, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export default function OfferForm({ vehicle }: { vehicle: Vehicle }) {
  const { firebaseUser, profile } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [offeredPrice, setOfferedPrice] = useState(vehicle.price);
  const [message, setMessage] = useState(
    `Hello, I am interested in your ${vehicle.make} ${vehicle.model} ${vehicle.year}.`,
  );
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!firebaseUser || !profile) {
      toast.error("Log in to make an offer.");
      router.push("/login");
      return;
    }

    try {
      setSubmitting(true);
      const offerId = await createVehicleOffer({
        vehicle,
        buyer: {
          id: firebaseUser.uid,
          name: profile.name,
          email: profile.email,
          phone: profile.phone ?? "",
        },
        offeredPrice,
        message,
      });

      toast.success("Your offer has been sent.");
      setOpen(false);
      router.push(`/offers?highlight=${offerId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Offer could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-[#C9A227] bg-[#C9A227]/10 px-6 py-4 font-bold text-[#7A620F] transition hover:bg-[#C9A227]/20"
      >
        <BadgeDollarSign size={20} />
        Make an Offer
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Make an offer</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Asking price: {vehicle.currency} {vehicle.price.toLocaleString()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                <X />
              </button>
            </div>

            <label className="mt-6 block">
              <span className="mb-2 block text-sm font-semibold">Your offer</span>
              <input
                type="number"
                min="1"
                value={offeredPrice}
                onChange={(event) => setOfferedPrice(Number(event.target.value))}
                className="input"
              />
            </label>

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              className="input mt-4 resize-none"
            />

            <div className="mt-5 rounded-2xl bg-[#F8F9FA] p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span>Asking price</span>
                <span>
                  {vehicle.currency} {vehicle.price.toLocaleString()}
                </span>
              </div>

              <div className="mt-3 flex justify-between gap-4 font-bold">
                <span>Your offer</span>
                <span className="text-[#0B5D3B]">
                  {vehicle.currency} {Number.isFinite(offeredPrice) ? offeredPrice.toLocaleString() : "0"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white disabled:opacity-60"
            >
              {submitting && <Loader2 className="animate-spin" size={18} />}
              Send Offer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
