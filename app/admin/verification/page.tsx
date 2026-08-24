"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import { createAuditLog } from "@/services/auditService";
import { createNotification } from "@/services/notificationService";
import { getDealers, updateDealerStatus } from "@/services/dealerService";
import { reviewVerificationRequest, getVerificationRequests } from "@/services/verificationService";
import { updateUserRole } from "@/services/userService";
import { useAuth } from "@/contexts/AuthContext";
import type { Dealer } from "@/Types/dealer";
import type { VerificationRequest } from "@/Types/verification";
import { Loader2, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type Row = VerificationRequest & { dealer?: Dealer | null };

export default function AdminVerificationPage() {
  const { profile, firebaseUser } = useAuth();
  const [requests, setRequests] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | VerificationRequest["type"]>("all");

  const load = async () => {
    try {
      setLoading(true);
      const raw = await getVerificationRequests("pending");
      const dealers = await getDealers("pending");
      setRequests(
        raw.map((request) => ({
          ...request,
          dealer: dealers.find((dealer) => dealer.ownerId === request.userId) ?? null,
        })),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => ({ pending: requests.length }), [requests]);

  const filteredRequests = useMemo(() => {
    const term = query.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesType = typeFilter === "all" || request.type === typeFilter;
      const matchesQuery =
        !term ||
        [request.userName, request.userEmail, request.notes ?? "", request.type, request.status].some((value) =>
          value.toLowerCase().includes(term),
        );
      return matchesType && matchesQuery;
    });
  }, [requests, query, typeFilter]);

  const actor = {
    actorId: firebaseUser?.uid ?? "system",
    actorName: profile?.name ?? "Administrator",
    actorRole: profile?.role ?? "admin",
  };

  const approve = async (request: Row) => {
    try {
      await reviewVerificationRequest(request.id, "approved", actor.actorId, actor.actorName);

      if (request.type === "dealer") {
        await updateUserRole(request.userId, "dealer");
        if (request.dealer) {
          await updateDealerStatus(request.dealer.id, "verified");
        }
      }

      await createAuditLog({
        ...actor,
        action: "verification_approved",
        targetType: "verification",
        targetId: request.id,
        description: `Approved ${request.type} verification for ${request.userName}.`,
      });

      await createNotification({
        userId: request.userId,
        type: "verification",
        title: "Verification approved",
        message: "Your verification request was approved.",
        actionUrl: "/verification",
        link: "/verification",
      });

      toast.success("Verification approved.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification could not be approved.");
    }
  };

  const reject = async (request: Row) => {
    const reason = window.prompt("Enter a rejection reason:");
    if (!reason?.trim()) return;

    try {
      await reviewVerificationRequest(
        request.id,
        "rejected",
        actor.actorId,
        actor.actorName,
        reason.trim(),
      );

      await createAuditLog({
        ...actor,
        action: "verification_rejected",
        targetType: "verification",
        targetId: request.id,
        description: `Rejected ${request.type} verification for ${request.userName}.`,
      });

      await createNotification({
        userId: request.userId,
        type: "verification",
        title: "Verification rejected",
        message: reason.trim(),
        actionUrl: "/verification",
        link: "/verification",
      });

      toast.success("Verification rejected.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification could not be rejected.");
    }
  };

  return (
    <section className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-[#0B5D3B]" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
                  Verification
                </p>
                <h1 className="text-4xl font-bold text-[#121212]">Identity and dealer review</h1>
                <p className="mt-2 max-w-2xl text-gray-600">
                  Approve or reject verification requests and keep dealer profiles aligned with the marketplace status.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#F8F9FA] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Pending requests</p>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </div>
          </div>
        </header>

        <div className="grid gap-3 rounded-3xl bg-white p-4 shadow-sm sm:grid-cols-[1fr_180px]">
          <label className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] px-4 py-3">
            <Search className="text-gray-400" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search requests"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
            className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm outline-none"
          >
            <option value="all">All types</option>
            <option value="identity">Identity</option>
            <option value="private_seller">Private seller</option>
            <option value="dealer">Dealer</option>
          </select>
        </div>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center rounded-3xl bg-white shadow-sm">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center shadow-sm">
            <ShieldCheck className="mx-auto text-[#0B5D3B]" size={36} />
            <h2 className="mt-4 text-2xl font-bold">No pending requests</h2>
            <p className="mt-2 text-gray-600">Verification submissions will appear here for review.</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center shadow-sm">
            <h2 className="text-2xl font-bold">No matching requests</h2>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <article key={request.id} className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold">{request.userName}</h2>
                      <AdminStatusBadge status={request.type} />
                      <AdminStatusBadge status={request.status} />
                    </div>
                    <p className="text-sm text-gray-500">{request.userEmail}</p>
                    {request.notes ? <p className="text-sm text-gray-600">{request.notes}</p> : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void approve(request)}
                      className="rounded-full bg-[#0B5D3B] px-4 py-2 text-sm font-semibold text-white"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => void reject(request)}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-[#F8F9FA] p-4 text-sm">
                    <p className="text-gray-500">Dealer status</p>
                    <p className="font-semibold capitalize">{request.dealer?.status ?? "n/a"}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F8F9FA] p-4 text-sm">
                    <p className="text-gray-500">Request type</p>
                    <p className="font-semibold capitalize">{request.type.replaceAll("_", " ")}</p>
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
