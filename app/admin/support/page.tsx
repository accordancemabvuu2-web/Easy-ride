"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import { createAuditLog } from "@/services/auditService";
import { getSupportTickets, updateSupportTicket } from "@/services/supportService";
import { useAuth } from "@/contexts/AuthContext";
import type { SupportTicket } from "@/Types/support";
import { Headphones, Loader2, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function AdminSupportPage() {
  const { profile, firebaseUser } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SupportTicket["status"]>("all");

  const load = async () => {
    try {
      setLoading(true);
      setTickets(await getSupportTickets());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => {
    const open = tickets.filter((ticket) => ticket.status === "open").length;
    const inProgress = tickets.filter((ticket) => ticket.status === "in_progress").length;
    const resolved = tickets.filter((ticket) => ticket.status === "resolved").length;
    return { open, inProgress, resolved };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const term = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
      const matchesQuery =
        !term ||
        [ticket.subject, ticket.description, ticket.userName, ticket.userEmail, ticket.category, ticket.priority].some((value) =>
          value.toLowerCase().includes(term),
        );
      return matchesStatus && matchesQuery;
    });
  }, [tickets, query, statusFilter]);

  const actor = {
    actorId: firebaseUser?.uid ?? "system",
    actorName: profile?.name ?? "Administrator",
    actorRole: profile?.role ?? "admin",
  };

  const update = async (ticket: SupportTicket, status: SupportTicket["status"]) => {
    const response = window.prompt("Admin response (optional):") ?? ticket.adminResponse ?? "";
    try {
      await updateSupportTicket(ticket.id, status, response, actor.actorName);
      await createAuditLog({
        ...actor,
        action: "support_ticket_updated",
        targetType: "support_ticket",
        targetId: ticket.id,
        description: `Updated support ticket "${ticket.subject}" to ${status}.`,
      });
      toast.success("Support ticket updated.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Support ticket could not be updated.");
    }
  };

  return (
    <section className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-3">
              <Headphones className="text-[#0B5D3B]" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
                  Support
                </p>
                <h1 className="text-4xl font-bold text-[#121212]">Support tickets</h1>
                <p className="mt-2 max-w-2xl text-gray-600">
                  Follow up on account, payment, verification, and technical issues directly from the admin portal.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#F8F9FA] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Open</p>
                <p className="text-2xl font-bold">{stats.open}</p>
              </div>
              <div className="rounded-2xl bg-[#F8F9FA] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">In progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
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
              placeholder="Search tickets"
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
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center rounded-3xl bg-white shadow-sm">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center shadow-sm">
            <ShieldCheck className="mx-auto text-[#0B5D3B]" size={36} />
            <h2 className="mt-4 text-2xl font-bold">No support tickets found</h2>
            <p className="mt-2 text-gray-600">Customer requests will appear here as they come in.</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center shadow-sm">
            <h2 className="text-2xl font-bold">No matching tickets</h2>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => (
              <article key={ticket.id} className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold">{ticket.subject}</h2>
                      <AdminStatusBadge status={ticket.status} />
                      <AdminStatusBadge status={ticket.priority} />
                    </div>
                    <p className="text-sm text-gray-500">
                      {ticket.userName} · {ticket.category}
                    </p>
                    <p className="text-sm text-gray-600">{ticket.userEmail}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void update(ticket, "in_progress")}
                      className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold"
                    >
                      In progress
                    </button>
                    <button
                      type="button"
                      onClick={() => void update(ticket, "resolved")}
                      className="rounded-full bg-[#0B5D3B] px-4 py-2 text-sm font-semibold text-white"
                    >
                      Resolve
                    </button>
                  </div>
                </div>

                <p className="mt-4 leading-7 text-gray-600">{ticket.description}</p>
                {ticket.adminResponse ? (
                  <p className="mt-4 rounded-2xl bg-[#F8F9FA] p-4 text-sm text-gray-700">
                    <b>Admin response:</b> {ticket.adminResponse}
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
