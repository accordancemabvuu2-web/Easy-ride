"use client";

import Button from "@/Components/admin/Button";
import EmptyState from "@/Components/admin/EmptyState";
import Panel, { PanelHeader } from "@/Components/admin/Panel";
import PageHeader from "@/Components/admin/PageHeader";
import {
  getPendingDealerApplications,
  reviewDealerApplication,
  type DealerApplication,
} from "@/services/dealerVerificationAdminService";
import { formatDateTime } from "@/lib/format";
import { Building2, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const PAGE_SIZE = 100;

export default function AdminVerificationPage() {
  const [applications, setApplications] = useState<DealerApplication[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (nextPage = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setLoadError(null);

    try {
      const result = await getPendingDealerApplications(nextPage, PAGE_SIZE);
      setApplications((current) =>
        append ? [...current, ...result.applications] : result.applications,
      );
      setPage(result.page);
      setTotal(result.total);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Dealer applications could not be loaded.";
      setLoadError(message);
      if (append) toast.error(message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredApplications = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return applications;
    return applications.filter((application) =>
      [
        application.businessName,
        application.businessRegistrationNumber ?? "",
        application.contactEmail ?? "",
        application.contactPhone ?? "",
        application.description ?? "",
      ].some((value) => value.toLocaleLowerCase().includes(term)),
    );
  }, [applications, query]);

  const review = async (application: DealerApplication, decision: "approve" | "reject") => {
    const reason = decision === "reject"
      ? window.prompt("Enter the reason for rejecting this dealer application:")
      : undefined;

    if (decision === "reject" && !reason?.trim()) {
      if (reason !== null) toast.error("A rejection reason is required.");
      return;
    }

    if (decision === "approve" && !window.confirm(
      "Approve " + application.businessName + "? This grants approved dealer privileges.",
    )) return;

    setBusyId(application.id);
    try {
      await reviewDealerApplication(application.id, decision, reason ?? undefined);
      setApplications((current) => current.filter((item) => item.id !== application.id));
      setTotal((current) => Math.max(0, current - 1));
      toast.success(decision === "approve" ? "Dealer application approved." : "Dealer application rejected.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The dealer review could not be saved.");
    } finally {
      setBusyId(null);
    }
  };

  const hasMore = applications.length < total;

  return (
    <div className="min-w-0 space-y-5 px-4 py-6 sm:px-6">
      <PageHeader
        title="Dealer applications"
        meta={total + " pending"}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => void load()}
            disabled={loading || busyId !== null}
            aria-label="Refresh dealer applications"
          >
            <RefreshCw size={15} aria-hidden="true" />
            Refresh
          </Button>
        }
      />
      <p className="max-w-3xl text-sm leading-6 text-subtle">
        Review business details, then approve or reject each application. Approval changes dealer permissions and is recorded by the backend audit trail.
      </p>

      <label className="block max-w-xl">
        <span className="sr-only">Search dealer applications</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search business, registration number, email or phone"
          className="w-full rounded-lg border border-hairline bg-surface px-4 py-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
        />
      </label>

      {loadError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{loadError}</p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-56 items-center justify-center text-subtle" aria-live="polite">
          <Loader2 className="animate-spin" size={28} aria-hidden="true" />
          <span className="sr-only">Loading dealer applications</span>
        </div>
      ) : filteredApplications.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={query ? "No matching applications" : "No pending dealer applications"}
          message={query ? "Try a different search." : "New dealer applications will appear here."}
        />
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => (
            <Panel key={application.id} aria-label={"Dealer application: " + application.businessName}>
              <PanelHeader
                title={application.businessName}
                count={<span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">Pending review</span>}
              />
              <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1fr_auto]">
                <div className="min-w-0 space-y-3 text-sm">
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-subtle">Registration</dt>
                      <dd className="mt-1 break-words text-ink">{application.businessRegistrationNumber ?? "Not supplied"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-subtle">Submitted</dt>
                      <dd className="mt-1 text-ink">{application.createdAt ? formatDateTime(application.createdAt) : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-subtle">Business email</dt>
                      <dd className="mt-1 break-all text-ink">{application.contactEmail ?? "Not supplied"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-subtle">Business phone</dt>
                      <dd className="mt-1 break-words text-ink">{application.contactPhone ?? "Not supplied"}</dd>
                    </div>
                  </dl>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-subtle">Business description</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-ink">
                      {application.description ?? "No description supplied."}
                    </p>
                  </div>
                  <p className="text-xs text-subtle">
                    Business document uploads are not currently available in the application.
                  </p>
                </div>
                <div className="flex flex-row gap-2 lg:flex-col lg:justify-center">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => void review(application, "approve")}
                    disabled={busyId !== null}
                  >
                    {busyId === application.id ? <Loader2 className="animate-spin" size={15} aria-hidden="true" /> : null}
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => void review(application, "reject")}
                    disabled={busyId !== null}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </Panel>
          ))}
          {hasMore ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => void load(page + 1, true)}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
