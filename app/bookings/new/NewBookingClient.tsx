"use client";

import { getListingById } from "@/services/listingService";
import type { Vehicle } from "@/Types/vehicle";
import { ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, Loader2, MapPin, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function calculateDays(start: string, end: string) {
  if (!start || !end) return 0;
  const difference = new Date(`${end}T00:00:00`).getTime() - new Date(`${start}T00:00:00`).getTime();
  return difference > 0 ? Math.ceil(difference / (1000 * 60 * 60 * 24)) : 0;
}

function formatDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

export default function NewBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [startDate, setStartDate] = useState(searchParams.get("start") ?? searchParams.get("pickupDate") ?? "");
  const [endDate, setEndDate] = useState(searchParams.get("end") ?? searchParams.get("returnDate") ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const vehicleId = searchParams.get("vehicle");
    if (!vehicleId) {
      setLoading(false);
      return;
    }

    void getListingById(vehicleId).then(setVehicle).finally(() => setLoading(false));
  }, [searchParams]);

  const days = useMemo(() => calculateDays(startDate, endDate), [startDate, endDate]);
  const subtotal = vehicle ? days * vehicle.price : 0;
  const serviceFee = Math.round(subtotal * 0.05 * 100) / 100;
  const total = subtotal + serviceFee;

  const continueToCheckout = () => {
    if (!vehicle) return;
    if (!startDate || !endDate) {
      setError("Please select your pick-up and return dates.");
      return;
    }
    if (days <= 0) {
      setError("Return date must be after the pick-up date.");
      return;
    }
    router.push(`/checkout/${vehicle.id}?type=rental&start=${encodeURIComponent(startDate)}&end=${encodeURIComponent(endDate)}`);
  };

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]"><Loader2 className="animate-spin text-[#0B5D3B]" size={32} /></main>;
  }

  if (!vehicle || vehicle.listingType !== "rent") {
    return <main className="min-h-screen bg-[#F8F9FA] px-4 py-20 text-center text-[#202124]"><h1 className="text-3xl font-bold">Rental unavailable</h1><p className="mt-3 text-gray-500">This vehicle is not currently available for rental.</p><button type="button" onClick={() => router.push("/marketplace")} className="mt-6 rounded-full bg-[#0B5D3B] px-6 py-3 font-semibold text-white">Back to marketplace</button></main>;
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <header className="border-b border-[#E5E7EB] bg-white"><div className="mx-auto flex max-w-7xl items-center px-5 py-5 lg:px-8"><button type="button" onClick={() => router.back()} className="flex items-center gap-2 text-sm font-semibold text-[#0B5D3B]"><ArrowLeft size={18} /> Back</button><p className="mx-auto text-sm font-semibold">Rental booking review</p><span className="w-12" /></div></header>
      <div className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">Step 1 of 2</p>
        <h1 className="mt-2 text-4xl font-bold">Review your rental</h1>
        <p className="mt-3 max-w-2xl text-gray-500">Choose your dates, review the vehicle, and continue to secure your booking.</p>
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white">
              <div className="relative aspect-[16/8]"><Image src={vehicle.coverImage} alt={`${vehicle.make} ${vehicle.model}`} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 65vw" /></div>
              <div className="p-6"><p className="text-sm text-gray-500">{vehicle.year}</p><h2 className="mt-1 text-2xl font-bold">{vehicle.make} {vehicle.model}</h2><p className="mt-3 flex items-center gap-2 text-sm text-gray-500"><MapPin size={16} />{vehicle.location.city}, {vehicle.location.country}</p></div>
            </section>
            <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6">
              <div className="flex items-center gap-3"><CalendarDays className="text-[#0B5D3B]" /><div><h2 className="font-bold">Rental dates</h2><p className="text-sm text-gray-500">When do you need the vehicle?</p></div></div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-semibold">Pick-up date</span><input type="date" min={new Date().toISOString().split("T")[0]} value={startDate} onChange={(event) => { setStartDate(event.target.value); setError(""); }} className="input" /></label><label><span className="mb-2 block text-sm font-semibold">Return date</span><input type="date" min={startDate || new Date().toISOString().split("T")[0]} value={endDate} onChange={(event) => { setEndDate(event.target.value); setError(""); }} className="input" /></label></div>
              {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              {days > 0 && <div className="mt-5 rounded-2xl bg-green-50 p-4 text-sm text-green-800"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 size={17} /> Vehicle available for your selected dates</div><p className="mt-2">{formatDate(startDate)} to {formatDate(endDate)} · {days} {days === 1 ? "day" : "days"}</p></div>}
            </section>
            <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6"><div className="flex items-center gap-3"><ShieldCheck className="text-[#0B5D3B]" /><h2 className="font-bold">Easy Ride protection</h2></div><div className="mt-5 space-y-3 text-sm text-gray-600"><p>Secure booking and payment</p><p>Verified vehicle and seller information</p><p>Booking support from Easy Ride</p></div></section>
          </div>
          <aside className="h-fit rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm lg:sticky lg:top-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Booking summary</p><h2 className="mt-2 text-xl font-bold">{vehicle.make} {vehicle.model}</h2><div className="mt-6 space-y-4 text-sm"><div className="flex justify-between"><span className="text-gray-500">Daily rate</span><span>{vehicle.currency} {vehicle.price.toLocaleString()}</span></div><div className="flex justify-between"><span className="text-gray-500">Duration</span><span>{days > 0 ? `${days} days` : "Select dates"}</span></div><div className="flex justify-between"><span className="text-gray-500">Estimated total</span><span className="font-bold text-[#0B5D3B]">{days > 0 ? `${vehicle.currency} ${total.toLocaleString()}` : "—"}</span></div></div><button type="button" onClick={continueToCheckout} className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-5 py-4 font-bold text-white">Continue to checkout <ChevronRight size={18} /></button></aside>
        </div>
      </div>
    </main>
  );
}