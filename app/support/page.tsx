"use client";

import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import SupportTicketForm from "@/Components/SupportTicketForm";
import { useAuth } from "@/contexts/AuthContext";
import { getSupportTickets } from "@/services/supportService";
import type { SupportTicket } from "@/Types/support";
import { Headphones, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function SupportPage() {
  return (
    <RequireAuth>
      <SupportContent />
    </RequireAuth>
  );
}

function SupportContent() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTickets() {
      if (!profile) return;
      try {
        setLoading(true);
        setTickets(await getSupportTickets(profile.id));
      } finally {
        setLoading(false);
      }
    }

    void loadTickets();
  }, [profile]);

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />
      <section className="mx-auto max-w-6xl px-4 py-10 lg:px-6">
        <div className="flex items-center gap-3">
          <Headphones className="text-[#0B5D3B]" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
              Support
            </p>
            <h1 className="text-4xl font-bold">Customer support tickets</h1>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <SupportTicketForm />

          <div className="rounded-3xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-bold">Your tickets</h2>
            {loading ? (
              <div className="flex min-h-48 items-center justify-center">
                <Loader2 className="animate-spin text-[#0B5D3B]" size={28} />
              </div>
            ) : tickets.length === 0 ? (
              <p className="mt-4 text-sm text-gray-500">No tickets yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-2xl bg-[#F8F9FA] p-4">
                    <p className="font-semibold">{ticket.subject}</p>
                    <p className="text-sm text-gray-500">
                      {ticket.category} - {ticket.status}
                    </p>
                    {ticket.adminResponse && (
                      <p className="mt-2 text-sm text-gray-700">
                        Admin: {ticket.adminResponse}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
