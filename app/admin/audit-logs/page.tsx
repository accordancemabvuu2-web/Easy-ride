"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import { getAuditLogs } from "@/lib/clientFirebaseServices";
import type { AuditLog } from "@/Types/audit";
import { History, Loader2, Search, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 30;

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError("");
    try {
      const result = await getAuditLogs(nextPage, PAGE_SIZE);
      setLogs(result.logs);
      setTotal(result.total);
      setPage(result.page);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Audit logs could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1);
  }, [load]);

  const filteredLogs = useMemo(() => {
    const term = query.trim().toLowerCase();
    return logs.filter((log) =>
      !term ||
      [log.description, log.actorName, log.actorRole, log.action, log.targetType, log.targetId].some((value) =>
        value.toLowerCase().includes(term),
      ),
    );
  }, [logs, query]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="mx-auto w-full max-w-[1180px]">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-3">
              <History className="text-[#0B5D3B]" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">Audit logs</p>
                <h1 className="text-4xl font-bold text-[#121212]">Operational history</h1>
                <p className="mt-2 max-w-2xl text-gray-600">
                  Review marketplace actions, moderation activity, and support operations recorded by the backend.
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-[#F8F9FA] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Recorded entries</p>
              <p className="text-2xl font-bold">{total}</p>
            </div>
          </div>
        </header>

        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <label className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] px-4 py-3">
            <Search className="text-gray-400" size={18} aria-hidden="true" />
            <span className="sr-only">Search this page of audit logs</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search this page of audit logs"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
        </div>

        {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}<button type="button" className="ml-3 font-semibold underline" onClick={() => void load(page)}>Try again</button></div> : null}

        {loading ? (
          <div className="flex min-h-80 items-center justify-center rounded-3xl bg-white shadow-sm" aria-live="polite">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={32} aria-hidden="true" />
            <span className="sr-only">Loading audit logs</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center shadow-sm">
            <ShieldCheck className="mx-auto text-[#0B5D3B]" size={36} aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-bold">No audit logs found</h2>
            <p className="mt-2 text-gray-600">Backend-recorded admin actions will appear here.</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center shadow-sm">
            <h2 className="text-2xl font-bold">No matching logs on this page</h2>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <article key={log.id} className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl font-bold">{log.description}</h2>
                  <AdminStatusBadge status={log.action} />
                </div>
                <p className="mt-2 text-sm text-gray-500">Actor: {log.actorName} · Role: {log.actorRole} · Target: {log.targetType}</p>
                <p className="mt-2 text-sm text-gray-600">Target ID: {log.targetId || "Not recorded"}</p>
              </article>
            ))}
            <nav className="flex items-center justify-between rounded-2xl bg-white p-4" aria-label="Audit log pages">
              <button type="button" disabled={loading || page <= 1} onClick={() => void load(page - 1)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Previous</button>
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button type="button" disabled={loading || page >= totalPages} onClick={() => void load(page + 1)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Next</button>
            </nav>
          </div>
        )}
      </div>
    </section>
  );
}

