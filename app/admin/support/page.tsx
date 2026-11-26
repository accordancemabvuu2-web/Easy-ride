"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import {
  getAdminSupportMessages,
  getAdminSupportPage,
  sendAdminSupportReply,
  updateAdminSupportStatus,
  type AdminSupportTicket,
  type SupportMessage,
} from "@/services/adminSupportService";
import type { SupportStatus } from "@/Types/support";
import { formatDistanceToNow } from "date-fns";
import { Headphones, Loader2, MessageSquare, Search, Send, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

const PAGE_SIZE = 24;

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<SupportStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminSupportPage(page, PAGE_SIZE, statusFilter);
      setTickets(result.tickets);
      setTotal(result.total);
      if (selectedId && !result.tickets.some((ticket) => ticket.id === selectedId)) {
        setSelectedId(null);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Support tickets could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [page, selectedId, statusFilter]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  const selectedTicket = useMemo(
    () => tickets.find((ticket) => ticket.id === selectedId) ?? null,
    [selectedId, tickets],
  );

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    let active = true;
    setMessagesLoading(true);
    setMessageError(null);
    void getAdminSupportMessages(selectedId)
      .then((result) => { if (active) setMessages(result); })
      .catch((requestError: unknown) => {
        if (active) setMessageError(requestError instanceof Error ? requestError.message : "Messages could not be loaded.");
      })
      .finally(() => { if (active) setMessagesLoading(false); });
    return () => { active = false; };
  }, [selectedId]);

  const filteredTickets = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return tickets;
    return tickets.filter((ticket) =>
      [ticket.subject, ticket.category, ticket.userId, ticket.status]
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [query, tickets]);

  const updateStatus = async (ticket: AdminSupportTicket, status: SupportStatus) => {
    try {
      setSaving(true);
      await updateAdminSupportStatus(ticket.id, status);
      await loadTickets();
      if (selectedId === ticket.id) {
        setMessages(await getAdminSupportMessages(ticket.id));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Ticket status could not be updated.");
    } finally {
      setSaving(false);
    }
  };

  const submitReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTicket || !reply.trim()) return;
    try {
      setSaving(true);
      await sendAdminSupportReply(selectedTicket.id, reply);
      setReply("");
      setMessages(await getAdminSupportMessages(selectedTicket.id));
      await loadTickets();
    } catch (requestError) {
      setMessageError(requestError instanceof Error ? requestError.message : "Reply could not be sent.");
    } finally {
      setSaving(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="mx-auto w-full max-w-[1180px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Headphones className="text-[#0B5D3B]" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">Support</p>
            <h1 className="text-4xl font-bold text-[#121212]">Support tickets</h1>
            <p className="mt-2 max-w-2xl text-gray-600">Read customer messages and reply through the backend support thread.</p>
          </div>
        </div>
        <p className="text-sm text-gray-600">{loading ? "Loading…" : total.toLocaleString() + " tickets"}</p>
      </header>

      <div className="grid gap-3 rounded-3xl bg-white p-4 shadow-sm sm:grid-cols-[1fr_220px]">
        <label className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] px-4 py-3">
          <Search className="text-gray-400" size={18} aria-hidden="true" />
          <span className="sr-only">Search tickets on this page</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this page" className="w-full bg-transparent text-sm outline-none" />
        </label>
        <label className="sr-only" htmlFor="support-status-filter">Filter by ticket status</label>
        <select
          id="support-status-filter"
          value={statusFilter}
          onChange={(event) => { setPage(1); setStatusFilter(event.target.value as SupportStatus | "all"); }}
          className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm outline-none"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="waiting_for_user">Waiting for user</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {error ? <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p> : null}

      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-3xl bg-white" role="status" aria-label="Loading support tickets">
          <Loader2 className="animate-spin text-[#0B5D3B]" size={32} aria-hidden="true" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center">
          <ShieldCheck className="mx-auto text-[#0B5D3B]" size={36} aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-bold">{tickets.length ? "No matching tickets" : "No support tickets"}</h2>
          <p className="mt-2 text-gray-600">Ticket data is loaded from the backend support queue.</p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
          <div className="space-y-2">
            {filteredTickets.map((ticket) => (
              <button
                type="button"
                key={ticket.id}
                onClick={() => setSelectedId(ticket.id)}
                aria-pressed={selectedId === ticket.id}
                className={"w-full rounded-2xl border p-4 text-left transition " +
                  (selectedId === ticket.id ? "border-[#0B5D3B] bg-white shadow-sm" : "border-[#E5E7EB] bg-white hover:border-[#9BB7A8]")}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="font-semibold text-gray-900">{ticket.subject}</span>
                  <AdminStatusBadge status={ticket.status} />
                </span>
                <span className="mt-2 block text-xs text-gray-500">{ticket.category} · Account {ticket.userId.slice(-8)}</span>
                <span className="mt-1 block text-xs text-gray-500">
                  {ticket.lastMessageAt ? formatDistanceToNow(new Date(ticket.lastMessageAt), { addSuffix: true }) : "No recent message"}
                </span>
              </button>
            ))}
          </div>

          <section className="flex min-h-[420px] flex-col rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm" aria-label="Support conversation">
            {!selectedTicket ? (
              <div className="m-auto text-center text-gray-500">
                <MessageSquare className="mx-auto mb-3" size={28} aria-hidden="true" />
                Select a ticket to read its messages.
              </div>
            ) : (
              <>
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold">{selectedTicket.subject}</h2>
                    <p className="mt-1 text-sm text-gray-500">{selectedTicket.category} · Account {selectedTicket.userId}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTicket.status !== "in_progress" && selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" ? (
                      <button type="button" disabled={saving} onClick={() => void updateStatus(selectedTicket, "in_progress")} className="rounded-full border border-gray-300 px-3 py-2 text-xs font-semibold disabled:opacity-50">In progress</button>
                    ) : null}
                    {selectedTicket.status !== "resolved" && selectedTicket.status !== "closed" ? (
                      <button type="button" disabled={saving} onClick={() => void updateStatus(selectedTicket, "resolved")} className="rounded-full bg-[#0B5D3B] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Resolve</button>
                    ) : null}
                    {selectedTicket.status !== "closed" ? (
                      <button type="button" disabled={saving} onClick={() => void updateStatus(selectedTicket, "closed")} className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50">Close</button>
                    ) : null}
                  </div>
                </header>

                {messageError ? <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{messageError}</p> : null}

                <div className="flex-1 space-y-3 overflow-y-auto py-4">
                  {messagesLoading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#0B5D3B]" aria-label="Loading messages" /></div>
                  ) : messageError ? null : messages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-500">No messages were returned for this ticket.</p>
                  ) : messages.map((message) => (
                    <article key={message.id} className="rounded-2xl bg-[#F5F8F6] p-4">
                      <p className="text-xs font-semibold text-[#0B5D3B]">
                        {message.senderId === selectedTicket.userId ? "Customer" : "Support team"}
                        {message.createdAt ? " · " + new Date(message.createdAt).toLocaleString() : ""}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">{message.body}</p>
                    </article>
                  ))}
                </div>

                {selectedTicket.status !== "closed" ? (
                  <form onSubmit={submitReply} className="border-t border-gray-100 pt-4">
                    <label htmlFor="support-reply" className="sr-only">Reply to ticket</label>
                    <textarea
                      id="support-reply"
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      maxLength={5000}
                      rows={3}
                      required
                      className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-[#0B5D3B]"
                      placeholder="Write a support reply"
                    />
                    <button type="submit" disabled={saving || !reply.trim()} className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#0B5D3B] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                      {saving ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
                      Send reply
                    </button>
                  </form>
                ) : null}
              </>
            )}
          </section>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Previous</button>
        <span className="text-sm text-gray-600">Page {page} of {pageCount}</span>
        <button type="button" disabled={page >= pageCount || loading} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Next</button>
      </div>
    </section>
  );
}
