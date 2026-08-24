"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import { getAuditLogs } from "@/services/auditService";
import type { AuditLog } from "@/Types/audit";
import { History, Loader2, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        setLogs(await getAuditLogs());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => ({ total: logs.length }), [logs]);

  const filteredLogs = useMemo(() => {
    const term = query.trim().toLowerCase();
    return logs.filter((log) =>
      !term ||
      [log.description, log.actorName, log.actorRole, log.action, log.targetType, log.targetId].some((value) =>
        value.toLowerCase().includes(term),
      ),
    );
  }, [logs, query]);

  return (
    <section className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-3">
              <History className="text-[#0B5D3B]" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
                  Audit logs
                </p>
                <h1 className="text-4xl font-bold text-[#121212]">Operational history</h1>
                <p className="mt-2 max-w-2xl text-gray-600">
                  Review marketplace actions, moderation activity, and support operations in one audit trail.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#F8F9FA] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Total entries</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </header>

        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <label className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] px-4 py-3">
            <Search className="text-gray-400" size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search audit logs"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
        </div>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center rounded-3xl bg-white shadow-sm">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center shadow-sm">
            <ShieldCheck className="mx-auto text-[#0B5D3B]" size={36} />
            <h2 className="mt-4 text-2xl font-bold">No audit logs found</h2>
            <p className="mt-2 text-gray-600">Admin actions will appear here as the platform is used.</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center shadow-sm">
            <h2 className="text-2xl font-bold">No matching logs</h2>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <article key={log.id} className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold">{log.description}</h2>
                  <AdminStatusBadge status={log.action} />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Actor: {log.actorName} · Role: {log.actorRole} · Target: {log.targetType}
                </p>
                <p className="mt-2 text-sm text-gray-600">Target ID: {log.targetId}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
