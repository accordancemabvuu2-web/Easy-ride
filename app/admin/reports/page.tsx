"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import { getAdminReportsPage, updateAdminReport, type AdminReport, type AdminReportStatus } from "@/services/adminReportsService";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const PAGE_SIZE = 30;

export default function AdminReportsPage() {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<AdminReportStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminReportsPage(page, PAGE_SIZE, statusFilter);
      setReports(result.reports);
      setTotal(result.total);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Reports could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const filteredReports = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return reports;
    return reports.filter((report) =>
      [report.reason, report.description, report.reporterId, report.targetType, report.targetId, report.status]
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [query, reports]);

  const update = async (
    report: AdminReport,
    status: Exclude<AdminReportStatus, "open">,
  ) => {
    const resolution = status === "resolved"
      ? window.prompt("Enter the resolution recorded for this report:") ?? ""
      : undefined;
    if (status === "resolved" && !resolution?.trim()) {
      toast.error("A resolution is required.");
      return;
    }

    try {
      setUpdatingId(report.id);
      await updateAdminReport(report.id, status, resolution);
      toast.success(status === "investigating" ? "Report moved to investigation." : "Report " + status + ".");
      await loadReports();
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "Report could not be updated.");
    } finally {
      setUpdatingId(null);
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <section className="mx-auto w-full max-w-[1180px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-[#0B5D3B]" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">Reports</p>
            <h1 className="text-4xl font-bold text-[#121212]">Report review</h1>
            <p className="mt-2 max-w-2xl text-gray-600">
              Review reports and record decisions in the backend audit trail.
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600">{loading ? "Loading…" : total.toLocaleString() + " reports"}</p>
      </header>

      <div className="grid gap-3 rounded-3xl bg-white p-4 shadow-sm sm:grid-cols-[1fr_200px]">
        <label className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] px-4 py-3">
          <Search className="text-gray-400" size={18} aria-hidden="true" />
          <span className="sr-only">Search reports on this page</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search this page"
            className="w-full bg-transparent text-sm outline-none"
          />
        </label>
        <label className="sr-only" htmlFor="report-status-filter">Filter reports by status</label>
        <select
          id="report-status-filter"
          value={statusFilter}
          onChange={(event) => { setPage(1); setStatusFilter(event.target.value as AdminReportStatus | "all"); }}
          className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm outline-none"
        >
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {error ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-3xl bg-white shadow-sm" role="status" aria-label="Loading reports">
          <Loader2 className="animate-spin text-[#0B5D3B]" size={32} aria-hidden="true" />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center shadow-sm">
          <ShieldCheck className="mx-auto text-[#0B5D3B]" size={36} aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-bold">No reports found</h2>
          <p className="mt-2 text-gray-600">Reports submitted through the backend will appear here.</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center shadow-sm">
          <h2 className="text-2xl font-bold">No matches on this page</h2>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <article key={report.id} className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-bold capitalize">{report.reason.replaceAll("_", " ")}</h2>
                    <AdminStatusBadge status={report.status} />
                    <AdminStatusBadge status={report.targetType} label={report.targetType} />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Submitted {report.createdAt
                      ? formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })
                      : "at an unknown time"}
                  </p>
                  <p className="mt-2 break-all text-xs text-gray-600">Reporter ID: {report.reporterId}</p>
                  <p className="mt-1 break-all text-xs text-gray-600">Resource ID: {report.targetId}</p>
                  {report.description ? (
                    <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-[#F8F9FA] p-4 text-sm leading-6 text-gray-700">
                      {report.description}
                    </p>
                  ) : null}
                  {report.resolution ? (
                    <p className="mt-3 rounded-2xl bg-green-50 p-4 text-sm text-green-900">
                      Resolution: {report.resolution}
                    </p>
                  ) : null}
                </div>

                {report.status === "open" || report.status === "investigating" ? (
                  <div className="flex flex-wrap gap-2 lg:shrink-0">
                    {report.status === "open" ? (
                      <button
                        type="button"
                        disabled={updatingId === report.id}
                        onClick={() => void update(report, "investigating")}
                        className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold disabled:opacity-60"
                      >
                        Investigate
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={updatingId === report.id}
                      onClick={() => void update(report, "dismissed")}
                      className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold disabled:opacity-60"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === report.id}
                      onClick={() => void update(report, "resolved")}
                      className="rounded-full bg-[#0B5D3B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Resolve
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">Page {page} of {pageCount}</span>
        <button
          type="button"
          disabled={page >= pageCount || loading}
          onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </section>
  );
}
