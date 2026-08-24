"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import { getAllBookings, updateBookingStatus } from "@/services/bookingService";
import type { RentalBooking } from "@/Types/booking";
import { formatDistanceToNow } from "date-fns";
import { CalendarRange, Loader2, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RentalBooking["status"]>("all");

  const load = async () => {
    try {
      setLoading(true);
      setBookings(await getAllBookings());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Bookings could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => {
    const pending = bookings.filter((booking) => booking.status === "pending").length;
    const active = bookings.filter((booking) => ["awaiting_payment", "confirmed", "active"].includes(booking.status)).length;
    const disputed = bookings.filter((booking) => booking.status === "disputed").length;
    return { pending, active, disputed };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const term = query.trim().toLowerCase();
    return bookings.filter((booking) => {
      const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
      const matchesQuery =
        !term ||
        [
          booking.listingTitle,
          booking.renterName,
          booking.ownerName,
          booking.pickupDate,
          booking.returnDate,
          booking.status,
          booking.paymentStatus,
        ].some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesQuery;
    });
  }, [bookings, query, statusFilter]);

  const setStatus = async (
    bookingId: string,
    status: RentalBooking["status"],
    additionalData: Partial<RentalBooking> = {},
  ) => {
    try {
      await updateBookingStatus(bookingId, status, additionalData);
      toast.success("Booking updated.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking could not be updated.");
    }
  };

  return (
    <section className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-3">
              <CalendarRange className="text-[#0B5D3B]" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
                  Bookings
                </p>
                <h1 className="text-4xl font-bold text-[#121212]">Rental booking control</h1>
                <p className="mt-2 max-w-2xl text-gray-600">
                  Review booking requests, monitor approvals, and resolve disputed trips from one place.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#F8F9FA] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <div className="rounded-2xl bg-[#F8F9FA] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
              <div className="rounded-2xl bg-[#F8F9FA] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Disputed</p>
                <p className="text-2xl font-bold">{stats.disputed}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-3 rounded-3xl bg-white p-4 shadow-sm sm:grid-cols-[1fr_180px]">
          <label className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] px-4 py-3">
            <Search className="text-gray-400" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search bookings"
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
            <option value="awaiting_payment">Awaiting payment</option>
            <option value="confirmed">Confirmed</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center rounded-3xl bg-white shadow-sm">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center shadow-sm">
            <ShieldCheck className="mx-auto text-[#0B5D3B]" size={36} />
            <h2 className="mt-4 text-2xl font-bold">No bookings found</h2>
            <p className="mt-2 text-gray-600">Booking activity will appear here once renters start making requests.</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center shadow-sm">
            <h2 className="text-2xl font-bold">No matching bookings</h2>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <article key={booking.id} className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold">{booking.listingTitle}</h2>
                      <AdminStatusBadge status={booking.status} />
                      <AdminStatusBadge status={booking.paymentStatus} />
                    </div>
                    <p className="text-sm text-gray-500">
                      {booking.pickupDate} to {booking.returnDate} ·{" "}
                      {formatDistanceToNow(new Date(String(booking.createdAt ?? "1970-01-01T00:00:00.000Z")), { addSuffix: true })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {booking.renterName} requested from {booking.ownerName}
                    </p>
                    <p className="text-sm font-semibold text-[#0B5D3B]">
                      {booking.currency} {booking.totalAmount.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void setStatus(booking.id, "confirmed", { paymentStatus: "paid" })}
                      className="rounded-full bg-[#0B5D3B] px-4 py-2 text-sm font-semibold text-white"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => void setStatus(booking.id, "disputed")}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
                    >
                      Mark disputed
                    </button>
                    <button
                      type="button"
                      onClick={() => void setStatus(booking.id, "cancelled")}
                      className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {booking.renterMessage ? (
                  <p className="mt-4 rounded-2xl bg-[#F8F9FA] p-4 text-sm text-gray-700">
                    {booking.renterMessage}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
