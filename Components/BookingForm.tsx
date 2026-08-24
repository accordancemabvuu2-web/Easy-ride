"use client";

import { useAuth } from "@/contexts/AuthContext";
import { createRentalBooking } from "@/services/bookingService";
import type { Vehicle } from "@/Types/vehicle";
import { CalendarDays, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function BookingForm({ vehicle }: { vehicle: Vehicle }) {
  const { firebaseUser, profile } = useAuth();
  const router = useRouter();

  const today = format(new Date(), "yyyy-MM-dd");

  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [message, setMessage] = useState(
    `Hello, I would like to rent this ${vehicle.make} ${vehicle.model}.`,
  );
  const [submitting, setSubmitting] = useState(false);

  const totalDays = useMemo(() => {
    if (!pickupDate || !returnDate) return 0;
    return Math.max(
      0,
      differenceInCalendarDays(parseISO(returnDate), parseISO(pickupDate)) + 1,
    );
  }, [pickupDate, returnDate]);

  const subtotal = totalDays * vehicle.price;
  const serviceFee = subtotal * 0.05;
  const deposit = 0;
  const total = subtotal + serviceFee + deposit;

  const submitBooking = async () => {
    if (!firebaseUser || !profile) {
      toast.error("Log in to request a booking.");
      router.push("/login");
      return;
    }

    if (!pickupDate || !returnDate) {
      toast.error("Select pickup and return dates.");
      return;
    }

    try {
      setSubmitting(true);
      const booking = await createRentalBooking({
        vehicle,
        renter: {
          id: firebaseUser.uid,
          name: profile.name,
          email: profile.email,
          phone: profile.phone ?? "",
        },
        pickupDate,
        returnDate,
        message,
      });

      toast.success("Rental request submitted.");
      router.push(`/bookings/${booking.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking could not be created.");
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
          <h2 className="text-xl font-bold">Request this rental</h2>
          <p className="text-sm text-gray-500">
            Select your pickup and return dates.
          </p>
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

      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={3}
        className="input mt-4 resize-none"
        placeholder="Message for the vehicle owner"
      />

      <div className="mt-5 flex items-start gap-2 rounded-2xl bg-green-50 p-4 text-sm text-green-800">
        <ShieldCheck className="mt-0.5 shrink-0" size={18} />
        <p>No payment is required until the vehicle owner approves your request.</p>
      </div>

      {totalDays > 0 && (
        <div className="mt-5 rounded-2xl bg-[#F8F9FA] p-4 text-sm">
          <div className="flex justify-between gap-4">
            <span>
              {vehicle.currency} {vehicle.price.toLocaleString()} x {totalDays} days
            </span>
            <span>
              {vehicle.currency} {subtotal.toFixed(2)}
            </span>
          </div>
          <div className="mt-2 flex justify-between text-gray-500">
            <span>Service fee</span>
            <span>
              {vehicle.currency} {serviceFee.toFixed(2)}
            </span>
          </div>
          <div className="mt-2 flex justify-between text-gray-500">
            <span>Deposit</span>
            <span>
              {vehicle.currency} {deposit.toFixed(2)}
            </span>
          </div>
          <div className="mt-4 flex justify-between border-t border-[#E5E7EB] pt-4 text-base font-bold">
            <span>Total</span>
            <span>
              {vehicle.currency} {total.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={submitBooking}
        disabled={submitting || totalDays < 1}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting && <Loader2 className="animate-spin" size={19} />}
        Request Booking
      </button>
    </section>
  );
}
