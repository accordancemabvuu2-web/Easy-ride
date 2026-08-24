"use client";

import { getAllBookings } from "@/services/bookingService";
import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";

export default function AvailabilityCalendar({
  listingId,
}: {
  listingId: string;
}) {
  const [bookings, setBookings] = useState<
    Array<{
      id: string;
      pickupDate: string;
      returnDate: string;
      status: string;
      renterName: string;
      listingId: string;
    }>
  >([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey((value) => value + 1);
    window.addEventListener("storage", handler);

    return () => {
      window.removeEventListener("storage", handler);
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const allBookings = await getAllBookings();
      setBookings(
        allBookings.filter(
          (booking) =>
            booking.listingId === listingId &&
            ["awaiting_payment", "confirmed", "active"].includes(booking.status),
        ),
      );
    })();
  }, [listingId, refreshKey]);

  return (
    <section className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <CalendarDays className="text-[#0B5D3B]" />
        <div>
          <h2 className="text-xl font-bold">Availability</h2>
          <p className="text-sm text-gray-500">Reserved rental windows for this vehicle.</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <p className="mt-5 text-sm text-gray-500">No reserved dates yet.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {bookings.map((booking) => (
            <div key={booking.id} className="rounded-2xl bg-[#F8F9FA] p-4 text-sm">
              <p className="font-semibold text-[#202124]">
                {booking.pickupDate} to {booking.returnDate}
              </p>
              <p className="mt-1 text-gray-500">
                {booking.status.replaceAll("_", " ")} by {booking.renterName}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
