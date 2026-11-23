"use client";

import { getVehicleAvailability } from "@/services/listingService";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";

export default function AvailabilityCalendar({
  listingId,
}: {
  listingId: string;
}) {
  const dateInput = (date: Date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  };
  const today = dateInput(new Date());
  const tomorrow = dateInput(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(tomorrow);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkAvailability = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setAvailable(null);
    if (!startDate || !endDate || endDate < startDate) {
      setError("Choose a return date on or after your pickup date.");
      return;
    }
    try {
      setChecking(true);
      const result = await getVehicleAvailability(listingId, startDate, endDate);
      setAvailable(result.available);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Availability could not be checked.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <CalendarDays className="text-[#0B5D3B]" />
        <div>
          <h2 className="text-xl font-bold">Availability</h2>
          <p className="text-sm text-gray-500">Check your dates against confirmed vehicle bookings.</p>
        </div>
      </div>

      <form onSubmit={(event) => void checkAvailability(event)} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="grid gap-1 text-sm font-medium text-gray-700">
          Pickup
          <input type="date" value={startDate} min={today} onChange={(event) => setStartDate(event.target.value)} required className="rounded-xl border border-gray-200 px-3 py-2.5" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-gray-700">
          Return
          <input type="date" value={endDate} min={startDate || today} onChange={(event) => setEndDate(event.target.value)} required className="rounded-xl border border-gray-200 px-3 py-2.5" />
        </label>
        <button type="submit" disabled={checking} className="rounded-xl bg-[#0B5D3B] px-5 py-2.5 font-semibold text-white disabled:opacity-60">
          {checking ? "Checking…" : "Check dates"}
        </button>
      </form>
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      {available !== null ? (
        <p role="status" className={`mt-3 text-sm font-semibold ${available ? "text-green-700" : "text-amber-700"}`}>
          {available ? "These dates are available." : "This vehicle is already reserved for part of this period."}
        </p>
      ) : null}
    </section>
  );
}
