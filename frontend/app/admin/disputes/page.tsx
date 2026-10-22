"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import { getAllDisputes, updateDisputeStatus } from "@/services/disputeService";
import type { EasyRideDispute } from "@/Types/dispute";
import { AlertTriangle, Loader2, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<EasyRideDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EasyRideDispute["status"]>("all");

  const load = () => {
    try {
      setDisputes(getAllDisputes());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const open = disputes.filter((dispute) => dispute.status === "open").length;
    const investigating = disputes.filter((dispute) => dispute.status === "investigating").length;
    const resolved = disputes.filter((dispute) => dispute.status === "resolved").length;
    return { open, investigating, resolved };
  }, [disputes]);

  const filteredDisputes = useMemo(() => {
    const term = query.trim().toLowerCase();
    return disputes.filter((dispute) => {
      const matchesStatus = statusFilter === "all" || dispute.status === statusFilter;
      const matchesQuery =
        !term ||
        [
          dispute.reason,
          dispute.details,
          dispute.openedByName,
          dispute.listingId,
          dispute.bookingId ?? "",
          dispute.offerId ?? "",
          dispute.paymentId ?? "",
        ].some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesQuery;
    });
  }, [disputes, query, statusFilter]);

  const resolve = (disputeId: string, status: EasyRideDispute["status"]) => {
    try {
      updateDisputeStatus(disputeId, status);
      toast.success("Dispute updated.");
      load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Dispute could not be updated.");
    }
  };

  return (
    <section className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-[#0B5D3B]" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
                  Disputes
                </p>
                <h1 className="text-4xl font-bold text-[#121212]">Dispute handling</h1>
                <p className="mt-2 max-w-2xl text-gray-600">
                  Review open cases, move them into investigation, and close out resolved marketplace disputes.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#F8F9FA] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Open</p>
                <p className="text-2xl font-bold">{stats.open}</p>
              </div>
              <div className="rounded-2xl bg-[#F8F9FA] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Investigating</p>
                <p className="text-2xl font-bold">{stats.investigating}</p>
              </div>
              <div className="rounded-2xl bg-[#F8F9FA] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Resolved</p>
                <p className="text-2xl font-bold">{stats.resolved}</p>
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
              placeholder="Search disputes"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm outline-none"
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center rounded-3xl bg-white shadow-sm">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
          </div>
        ) : disputes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center shadow-sm">
            <ShieldCheck className="mx-auto text-[#0B5D3B]" size={36} />
            <h2 className="mt-4 text-2xl font-bold">No disputes found</h2>
            <p className="mt-2 text-gray-600">Any reported cases will show up here for admin review.</p>
          </div>
        ) : filteredDisputes.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center shadow-sm">
            <h2 className="text-2xl font-bold">No matching disputes</h2>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDisputes.map((dispute) => (
              <article key={dispute.id} className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold">{dispute.reason}</h2>
                      <AdminStatusBadge status={dispute.status} />
                    </div>
                    <p className="text-sm text-gray-600">{dispute.details}</p>
                    <p className="text-sm text-gray-500">Opened by {dispute.openedByName}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => resolve(dispute.id, "investigating")}
                      className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold"
                    >
                      Investigate
                    </button>
                    <button
                      type="button"
                      onClick={() => resolve(dispute.id, "resolved")}
                      className="rounded-full bg-[#0B5D3B] px-4 py-2 text-sm font-semibold text-white"
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      onClick={() => resolve(dispute.id, "closed")}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
                    >
                      Close
                    </button>
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
