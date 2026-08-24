"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import { getAllPayments } from "@/services/paymentService";
import type { EasyRidePayment } from "@/Types/payment";
import { Banknote, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<EasyRidePayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        setPayments(getAllPayments());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const successful = payments.filter((payment) => payment.status === "successful").length;
    const pending = payments.filter((payment) => payment.status === "pending").length;
    const refunded = payments.filter((payment) => payment.status === "refunded").length;
    return { successful, pending, refunded };
  }, [payments]);

  return (
    <section className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-3">
              <Banknote className="text-[#0B5D3B]" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
                  Payments
                </p>
                <h1 className="text-4xl font-bold text-[#121212]">Payment monitoring</h1>
                <p className="mt-2 max-w-2xl text-gray-600">
                  Track booking, promotion, and subscription payments as they move through the marketplace.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#F8F9FA] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <div className="rounded-2xl bg-[#F8F9FA] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Successful</p>
                <p className="text-2xl font-bold">{stats.successful}</p>
              </div>
              <div className="rounded-2xl bg-[#F8F9FA] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Refunded</p>
                <p className="text-2xl font-bold">{stats.refunded}</p>
              </div>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center rounded-3xl bg-white shadow-sm">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center shadow-sm">
            <ShieldCheck className="mx-auto text-[#0B5D3B]" size={36} />
            <h2 className="mt-4 text-2xl font-bold">No payments found</h2>
            <p className="mt-2 text-gray-600">Payment records will show here once transactions begin.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <article key={payment.id} className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold">{payment.purpose.replaceAll("_", " ")}</h2>
                      <AdminStatusBadge status={payment.status} />
                    </div>
                    <p className="text-sm text-gray-500">Reference: {payment.referenceId}</p>
                    <p className="text-sm text-gray-600">Provider: {payment.provider}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#0B5D3B]">
                      {payment.currency} {payment.amount.toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">User: {payment.userId}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
