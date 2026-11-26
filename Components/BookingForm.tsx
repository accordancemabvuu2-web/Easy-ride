"use client";

import { useAuth } from "@/contexts/AuthContext";
import { startConversation } from "@/lib/clientFirebaseServices";
import type { Vehicle } from "@/Types/vehicle";
import { CalendarDays, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { Suspense, useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function BookingForm({ vehicle }: { vehicle: Vehicle }) {
  return (
    <Suspense fallback={<BookingFormBody vehicle={vehicle} pickupDate="" returnDate="" />}>
      <BookingFormWithSearchParams vehicle={vehicle} />
    </Suspense>
  );
}

function BookingFormWithSearchParams({ vehicle }: { vehicle: Vehicle }) {
  const searchParams = useSearchParams();
  return (
    <BookingFormBody
      vehicle={vehicle}
      pickupDate={searchParams.get("pickupDate") ?? ""}
      returnDate={searchParams.get("returnDate") ?? ""}
    />
  );
}

function BookingFormBody({
  vehicle,
  pickupDate: initialPickupDate,
  returnDate: initialReturnDate,
}: {
  vehicle: Vehicle;
  pickupDate: string;
  returnDate: string;
}) {
  const { profile } = useAuth();
  const router = useRouter();
  const today = format(new Date(), "yyyy-MM-dd");
  const [pickupDate, setPickupDate] = useState(initialPickupDate);
  const [returnDate, setReturnDate] = useState(initialReturnDate);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const totalDays = useMemo(() => {
    if (!pickupDate || !returnDate) return 0;
    const days = differenceInCalendarDays(parseISO(returnDate), parseISO(pickupDate)) + 1;
    return Math.max(0, days);
  }, [pickupDate, returnDate]);

  const estimate = totalDays * vehicle.price;

  const submitEnquiry = async () => {
    if (!profile) {
      toast.error("Log in to contact the seller.");
      router.push("/login");
      return;
    }
    if (!pickupDate || !returnDate || totalDays < 1) {
      toast.error("Select valid pickup and return dates.");
      return;
    }

    const enquiry = [
      "I am interested in renting this vehicle.",
      "Requested dates: " + pickupDate + " to " + returnDate + ".",
      message.trim(),
    ].filter(Boolean).join("\n");

    try {
      setSubmitting(true);
      const conversationId = await startConversation(
        vehicle,
        { id: profile.id, name: profile.name },
        enquiry,
      );
      router.push("/messages?conversation=" + encodeURIComponent(conversationId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The rental enquiry could not be sent.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0B5D3B]/10 text-[#0B5D3B]">
          <CalendarDays size={23} />
        </div>
        <div>
          <h2 className="text-xl font-bold">Ask about this rental</h2>
          <p className="text-sm text-gray-500">Choose the dates you want and send the seller an enquiry.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label>
          <span className="mb-2 block text-sm font-semibold">Pickup date</span>
          <input
            type="date"
            min={today}
            value={pickupDate}
            onChange={(event) => setPickupDate(event.target.value)}
            className="input"
          />
        </label>
        <label>
          <span className="mb-2 block text-sm font-semibold">Return date</span>
          <input
            type="date"
            min={pickupDate || today}
            value={returnDate}
            onChange={(event) => setReturnDate(event.target.value)}
            className="input"
          />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-semibold">Message to the seller (optional)</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
          maxLength={2000}
          className="input resize-none"
          placeholder="Ask about availability, handover, or rental terms."
        />
      </label>

      <div className="mt-5 flex items-start gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
        <ShieldCheck className="mt-0.5 shrink-0" size={18} />
        <p>This sends an enquiry only. It does not reserve the vehicle or take payment. Confirm availability and terms with the seller.</p>
      </div>

      {totalDays > 0 && (
        <div className="mt-5 rounded-2xl bg-[#F8F9FA] p-4 text-sm">
          <div className="flex justify-between gap-4">
            <span>{vehicle.currency} {vehicle.price.toLocaleString()} x {totalDays} days</span>
            <span>{vehicle.currency} {estimate.toFixed(2)} estimated</span>
          </div>
          <p className="mt-2 text-gray-500">Final rental terms are agreed with the seller.</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => void submitEnquiry()}
        disabled={submitting || (!!profile && totalDays < 1)}
        className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Sending enquiry..." : "Ask seller about availability"}
      </button>
    </section>
  );
}
