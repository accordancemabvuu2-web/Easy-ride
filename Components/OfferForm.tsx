"use client";

import { useAuth } from "@/contexts/AuthContext";
import { createVehicleOffer } from "@/services/offerService";
import type { Vehicle } from "@/Types/vehicle";
import { BadgeDollarSign, Loader2, MessageCircle, Phone, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { startConversation } from "@/services/messageService";
import { useState } from "react";
import toast from "react-hot-toast";

export default function OfferForm({ vehicle, buttonClassName, buttonLabel = "Offer" }: { vehicle: Vehicle; buttonClassName?: string; buttonLabel?: string }) {
  const { profile } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [offeredPrice, setOfferedPrice] = useState(String(Math.max(1, Math.floor(vehicle.price * 0.95))));
  const [message, setMessage] = useState(
    `Hello, I am interested in your ${vehicle.make} ${vehicle.model} ${vehicle.year}.`,
  );
  const [submitting, setSubmitting] = useState(false);
  const amount = Number(offeredPrice);
  const amountIsValid = Number.isInteger(amount) && amount > 0 && amount < vehicle.price && message.length <= 500;
  const savings = amountIsValid ? vehicle.price - amount : 0;
  const savingsPercent = vehicle.price > 0 ? (savings / vehicle.price) * 100 : 0;

  const showForm = () => {
    setOfferedPrice(String(Math.max(1, Math.floor(vehicle.price * 0.95))));
    setMessage(`Hello, I am interested in your ${vehicle.make} ${vehicle.model} ${vehicle.year}.`);
    setOpen(true);
  };

  const submit = async () => {
    if (!profile) {
      toast.error("Log in to make an offer.");
      router.push("/login");
      return;
    }

    try {
      setSubmitting(true);
      const offerId = await createVehicleOffer({
        vehicle,
        buyer: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          phone: profile.phone ?? "",
        },
        offeredPrice: amount,
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

  const sendMessage = async () => {
    if (!profile) {
      toast.error("Log in to message the seller.");
      router.push("/login");
      return;
    }
    if (profile.id === vehicle.ownerId) {
      toast.error("This is your own listing.");
      return;
    }
    try {
      setSubmitting(true);
      const conversationId = await startConversation(vehicle, { id: profile.id, name: profile.name }, `${message.trim()} My offer is ${vehicle.currency} ${amount.toLocaleString()}.`);
      setOpen(false);
      router.push(`/messages?conversation=${conversationId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The message could not be sent.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!profile) {
            toast.error("Log in to make an offer.");
            router.push("/login");
            return;
          }

          showForm();
        }}
        className={buttonClassName ?? "inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#B7D8C8] px-2 py-2.5 text-sm font-bold text-[#07543D] transition hover:bg-[#EFF9F4]"}
      >
        <BadgeDollarSign size={17} />
        {buttonLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="make-offer-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="make-offer-title" className="text-2xl font-bold">Make an offer</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Asking price: {vehicle.currency} {vehicle.price.toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-gray-500">Seller: {vehicle.ownerName} · {vehicle.location.city}</p>
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
                max={vehicle.price - 1}
                step="1"
                inputMode="numeric"
                value={offeredPrice}
                onChange={(event) => setOfferedPrice(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[#DCE5DF] px-4 py-3 outline-none focus:border-[#0B7652]"
                aria-describedby="offer-guidance"
                required
              />
            </label>

            <button type="button" onClick={() => setOfferedPrice(String(Math.max(1, Math.floor(vehicle.price * 0.95))))} className="mt-2 text-xs font-bold text-[#07543D] hover:underline">Use suggested offer · {vehicle.currency} {Math.max(1, Math.floor(vehicle.price * 0.95)).toLocaleString()}</button>
            <p id="offer-guidance" className="mt-2 text-xs text-gray-500">Enter a whole-dollar amount below asking price.</p>

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-semibold">Message to seller <span className="font-normal text-gray-500">(optional)</span></span>
              <textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 500))} rows={4} maxLength={500} className="w-full resize-none rounded-xl border border-[#DCE5DF] p-3 outline-none focus:border-[#0B7652]" />
              <span className="mt-1 block text-right text-xs text-gray-500">{message.length}/500</span>
            </label>

            {amountIsValid && <div className="mt-4 rounded-xl border border-[#DCE9DC] bg-[#F4F9F2] p-3 text-sm"><div className="flex justify-between gap-4"><span className="text-gray-600">Below asking price</span><b className="text-[#20583B]">{vehicle.currency} {savings.toLocaleString()} ({savingsPercent.toFixed(1)}%)</b></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#DDE8DB]"><div className="h-full rounded-full bg-[#2E8759]" style={{width:`${Math.min(100,savingsPercent)}%`}}/></div></div>}
            {offeredPrice && !amountIsValid && <p role="alert" className="mt-3 text-sm text-red-700">Enter a whole-dollar offer greater than zero and below the asking price.</p>}

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
                  {vehicle.currency} {Number.isFinite(amount) ? amount.toLocaleString() : "0"}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <button type="button" onClick={submit} disabled={submitting || !amountIsValid} className="flex items-center justify-center gap-2 rounded-xl bg-[#0B5D3B] px-3 py-3 text-sm font-bold text-white disabled:opacity-60">
                {submitting ? <Loader2 className="animate-spin" size={17} /> : <Send size={16} />} Send offer
              </button>
              {vehicle.ownerPhone ? <a href={`tel:${vehicle.ownerPhone}`} className="flex items-center justify-center gap-2 rounded-xl border border-[#B7D8C8] px-3 py-3 text-sm font-bold text-[#07543D]"><Phone size={16}/>Book a call</a> : <button type="button" disabled className="flex items-center justify-center gap-2 rounded-xl border border-[#B7D8C8] px-3 py-3 text-sm font-bold text-[#07543D] opacity-50"><Phone size={16}/>Call unavailable</button>}
              <button type="button" onClick={() => void sendMessage()} disabled={submitting || !message.trim() || !amountIsValid} className="flex items-center justify-center gap-2 rounded-xl border border-[#B7D8C8] px-3 py-3 text-sm font-bold text-[#07543D] disabled:opacity-50"><MessageCircle size={16}/>Send message</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
