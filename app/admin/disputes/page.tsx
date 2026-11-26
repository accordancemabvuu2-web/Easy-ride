"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import { getAdminReportsPage, updateAdminReport, type AdminReport, type AdminReportStatus } from "@/services/adminReportsService";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const PAGE_SIZE = 30;

export default function AdminDisputesPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminReportStatus | "all">("all");

  const load = useCallback(async (nextPage = 1, status = statusFilter) => {
    setLoading(true);
    setError("");
    try {
      const result = await getAdminReportsPage(nextPage, PAGE_SIZE, status);
      setReports(result.reports.filter((report) => report.targetType === "booking"));
      setTotal(result.total);
      setPage(result.page);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Booking reports could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load(1, statusFilter);
  }, [load, statusFilter]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return reports.filter((report) =>
      !term || [report.reason, report.description, report.targetId, report.reporterId].some((value) => value.toLowerCase().includes(term)),
    );
  }, [reports, query]);

  const updateStatus = async (report: AdminReport, status: Exclude<AdminReportStatus, "open">) => {
    let resolution: string | undefined;
    if (status === "resolved") {
      resolution = window.prompt("Record the resolution for this booking report:")?.trim();
      if (!resolution) return;
    } else if (status === "dismissed") {
      resolution = window.prompt("Record why this booking report is dismissed:")?.trim();
      if (!resolution) return;
    }
    setSavingId(report.id);
    try {
      await updateAdminReport(report.id, status, resolution);
      toast.success("Booking report updated.");
      await load(page, statusFilter);
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "Booking report could not be updated.");
    } finally {
      setSavingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="mx-auto w-full max-w-[1180px] space-y-6">
      <header className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-[#0B5D3B]" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">Reports</p>
              <h1 className="text-4xl font-bold text-[#121212]">Booking reports</h1>
              <p className="mt-2 max-w-2xl text-gray-600">
                Review reports linked to bookings. Status changes and resolutions are recorded by the backend.
              </p>
            </div>
          </div>
          <button type="button" onClick={() => void load(page)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">
            <RefreshCw size={15} aria-hidden="true" /> Refresh
          </button>
        </div>
      </header>

      <div className="grid gap-3 rounded-3xl bg-white p-4 shadow-sm sm:grid-cols-[1fr_220px]">
        <label className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] px-4 py-3">
          <span className="sr-only">Search this page of booking reports</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this page of reports" className="w-full bg-transparent text-sm outline-none" />
        </label>
        <label className="sr-only" htmlFor="booking-report-status">Filter booking reports by status</label>
        <select id="booking-report-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AdminReportStatus | "all")} className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm outline-none">
          <option value="all">All report statuses</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}<button type="button" onClick={() => void load(page)} className="ml-3 font-semibold underline">Try again</button></div> : null}

      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-3xl bg-white" aria-live="polite"><Loader2 className="animate-spin text-[#0B5D3B]" size={30} aria-hidden="true" /><span className="sr-only">Loading booking reports</span></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center shadow-sm">
          <h2 className="text-2xl font-bold">{query ? "No matching booking reports on this page" : reports.length ? "No matching booking reports" : "No booking reports on this page"}</h2>
          <p className="mt-2 text-sm text-gray-600">The backend page includes other report types. Use the page controls to review more records.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((report) => (
            <article key={report.id} className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold">{report.reason.replaceAll("_", " ")}</h2>
                <AdminStatusBadge status={report.status} />
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">{report.description || "No additional details supplied."}</p>
              <p className="mt-2 break-all text-xs text-gray-500">Booking {report.targetId} · Reporter {report.reporterId}</p>
              {report.resolution ? <p className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">Resolution: {report.resolution}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={savingId !== null || report.status === "investigating"} onClick={() => void updateStatus(report, "investigating")} className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold disabled:opacity-50">Investigate</button>
                <button type="button" disabled={savingId !== null || report.status === "resolved"} onClick={() => void updateStatus(report, "resolved")} className="rounded-full bg-[#0B5D3B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{savingId === report.id ? "Saving…" : "Resolve"}</button>
                <button type="button" disabled={savingId !== null || report.status === "dismissed"} onClick={() => void updateStatus(report, "dismissed")} className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50">Dismiss</button>
              </div>
            </article>
          ))}
          <nav className="flex items-center justify-between rounded-2xl bg-white p-4" aria-label="Report pages">
            <button type="button" disabled={loading || page <= 1} onClick={() => void load(page - 1)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Previous</button>
            <span className="text-sm text-gray-600">Reports page {page} of {totalPages} ({total} total)</span>
            <button type="button" disabled={loading || page >= totalPages} onClick={() => void load(page + 1)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Next</button>
          </nav>
        </div>
      )}
    </section>
  );
}

