"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import { createAuditLog } from "@/services/auditService";
import { createNotification } from "@/services/notificationService";
import { getListingById, updateListingStatus } from "@/services/listingService";
import {
  getListingReports,
  getReportsForListing,
  resolveListingReport,
} from "@/services/reportService";
import { useAuth } from "@/contexts/AuthContext";
import type { ListingReport } from "@/Types/report";
import type { Vehicle } from "@/Types/vehicle";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Search, ShieldAlert, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type ReportView = ListingReport & {
  listing?: Vehicle | null;
  otherReportsCount?: number;
};

export default function AdminReportsPage() {
  const { profile, firebaseUser } = useAuth();
  const [reports, setReports] = useState<ReportView[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ListingReport["status"]>("all");

  const loadReports = async () => {
    try {
      setLoading(true);
      const rawReports = await getListingReports();
      const enriched = await Promise.all(
        rawReports.map(async (report) => ({
          ...report,
          listing: await getListingById(report.listingId),
          otherReportsCount: (await getReportsForListing(report.listingId)).length,
        })),
      );
      setReports(enriched);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
  }, []);

  const stats = useMemo(() => {
    const open = reports.filter((report) => report.status === "open").length;
    const reviewing = reports.filter((report) => report.status === "reviewing").length;
    const resolved = reports.filter((report) => report.status === "resolved").length;
    return { open, reviewing, resolved };
  }, [reports]);

  const filteredReports = useMemo(() => {
    const term = query.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesStatus = statusFilter === "all" || report.status === statusFilter;
      const matchesQuery =
        !term ||
        [
          report.reason,
          report.listingTitle,
          report.reportedBy,
          report.details ?? "",
          report.status,
        ].some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesQuery;
    });
  }, [query, reports, statusFilter]);

  const actor = {
    actorId: firebaseUser?.uid ?? "system",
    actorName: profile?.name ?? "Administrator",
    actorRole: profile?.role ?? "admin",
  };

  const dismiss = async (report: ReportView) => {
    try {
      await resolveListingReport(report.id, "dismissed");
      await createAuditLog({
        ...actor,
        action: "report_resolved",
        targetType: "report",
        targetId: report.id,
        description: `Dismissed report for ${report.listingTitle}.`,
      });
      await createNotification({
        userId: report.reportedBy,
        type: "listing",
        title: "Report reviewed",
        message: `Your report for ${report.listingTitle} was reviewed.`,
        actionUrl: "/notifications",
        link: "/notifications",
      });
      toast.success("Report dismissed.");
      await loadReports();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Report could not be updated.");
    }
  };

  const suspend = async (report: ReportView) => {
    if (!report.listing) return;
    try {
      await updateListingStatus(report.listing.id, "suspended");
      await resolveListingReport(report.id, "resolved");
      await createAuditLog({
        ...actor,
        action: "listing_suspended",
        targetType: "listing",
        targetId: report.listing.id,
        description: `Suspended ${report.listing.make} ${report.listing.model}.`,
      });
      await createNotification({
        userId: report.listing.ownerId,
        type: "listing",
        title: "Listing suspended",
        message: `${report.listing.make} ${report.listing.model} was suspended after review.`,
        actionUrl: `/vehicle/${report.listing.id}`,
        link: `/vehicle/${report.listing.id}`,
      });
      toast.success("Listing suspended.");
      await loadReports();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Listing could not be suspended.");
    }
  };

  const restore = async (report: ReportView) => {
    if (!report.listing) return;
    try {
      await updateListingStatus(report.listing.id, "active");
      await resolveListingReport(report.id, "resolved");
      await createAuditLog({
        ...actor,
        action: "listing_restored",
        targetType: "listing",
        targetId: report.listing.id,
        description: `Restored ${report.listing.make} ${report.listing.model}.`,
      });
      toast.success("Listing restored.");
      await loadReports();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Listing could not be restored.");
    }
  };

  return (
    <section className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-[#0B5D3B]" />
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
                  Reports
                </p>
                <h1 className="text-4xl font-bold text-[#121212]">Listing report management</h1>
                <p className="mt-2 max-w-2xl text-gray-600">
                  Review user reports, suspend listings when necessary, and keep the marketplace trustworthy.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#F8F9FA] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Open</p>
                <p className="text-2xl font-bold">{stats.open}</p>
              </div>
              <div className="rounded-2xl bg-[#F8F9FA] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Reviewing</p>
                <p className="text-2xl font-bold">{stats.reviewing}</p>
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
              placeholder="Search reports"
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
            <option value="reviewing">Reviewing</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>

        {loading ? (
          <div className="flex min-h-80 items-center justify-center rounded-3xl bg-white shadow-sm">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center shadow-sm">
            <ShieldCheck className="mx-auto text-[#0B5D3B]" size={36} />
            <h2 className="mt-4 text-2xl font-bold">No reports found</h2>
            <p className="mt-2 text-gray-600">When users flag a listing, it will appear here for moderation.</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-12 text-center shadow-sm">
            <h2 className="text-2xl font-bold">No matching reports</h2>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredReports.map((report) => (
              <article key={report.id} className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#C9A227]">
                        {report.reason.replaceAll("_", " ")}
                      </p>
                      <AdminStatusBadge status={report.status} />
                    </div>
                    <h2 className="mt-1 text-2xl font-bold">{report.listingTitle}</h2>
                    <p className="mt-2 text-sm text-gray-500">
                      Reported{" "}
                      {formatDistanceToNow(new Date(String(report.createdAt ?? "1970-01-01T00:00:00.000Z")), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void dismiss(report)}
                      className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold"
                    >
                      Dismiss
                    </button>
                    {report.listing?.status !== "suspended" ? (
                      <button
                        type="button"
                        onClick={() => void suspend(report)}
                        className="rounded-full bg-[#0B5D3B] px-4 py-2 text-sm font-semibold text-white"
                      >
                        Suspend listing
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void restore(report)}
                        className="rounded-full bg-[#0B5D3B] px-4 py-2 text-sm font-semibold text-white"
                      >
                        Restore listing
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-[#F8F9FA] p-4">
                    <p className="text-sm text-gray-500">Reporter</p>
                    <p className="font-semibold">{report.reportedBy}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F8F9FA] p-4">
                    <p className="text-sm text-gray-500">Listing status</p>
                    <p className="font-semibold capitalize">{report.listing?.status ?? "unknown"}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F8F9FA] p-4">
                    <p className="text-sm text-gray-500">Other reports</p>
                    <p className="font-semibold">{report.otherReportsCount ?? 0}</p>
                  </div>
                  <div className="rounded-2xl bg-[#F8F9FA] p-4">
                    <p className="text-sm text-gray-500">Current state</p>
                    <p className="font-semibold">{report.status}</p>
                  </div>
                </div>

                {report.details ? (
                  <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{report.details}</p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
