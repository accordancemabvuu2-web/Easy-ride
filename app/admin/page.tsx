"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import Button from "@/Components/admin/Button";
import EmptyState from "@/Components/admin/EmptyState";
import KpiStrip, { type KpiItem } from "@/Components/admin/KpiStrip";
import PageHeader from "@/Components/admin/PageHeader";
import Panel, { PanelHeader } from "@/Components/admin/Panel";
import { useAuth } from "@/contexts/AuthContext";
import { cx } from "@/lib/classNames";
import {
  getAdminListings,
  getAdminUserCount,
  getAdminUsers,
  getAuditLogs,
  getAllBookings,
  getAllOffers,
  getAllPayments,
  getListingReports,
  getSupportTickets,
  getVerificationRequests,
} from "@/lib/clientFirebaseServices";
import { formatAuditStamp, formatCount, formatCurrencyAmount } from "@/lib/format";
import type { AuditLog } from "@/Types/audit";
import type { Vehicle } from "@/Types/vehicle";
import {
  Ban,
  Car,
  Check,
  ChevronRight,
  Clock,
  Flag,
  Headphones,
  History,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type OverviewData = {
  users: number | null;
  suspendedUsers: number | null;
  listings: Vehicle[];
  bookings: Array<{ status: string }>;
  offers: Array<{ status: string }>;
  payments: number;
  supportTickets: Array<{ status: string }>;
  reports: Array<{ status: string }>;
  verificationRequests: number;
  auditLogs: AuditLog[];
};

const EMPTY_DATA: OverviewData = {
  users: null,
  suspendedUsers: null,
  listings: [],
  bookings: [],
  offers: [],
  payments: 0,
  supportTickets: [],
  reports: [],
  verificationRequests: 0,
  auditLogs: [],
};

function countStatus(items: Array<{ status: string }>, status: string): number {
  return items.filter((item) => item.status === status).length;
}

function actionIcon(action: string) {
  if (action === "listing_approved" || action === "listing_restored") return Check;
  if (action === "listing_rejected" || action === "verification_rejected") return X;
  if (action === "verification_approved") return ShieldCheck;
  if (action === "report_resolved") return Flag;
  if (action === "support_ticket_updated") return Headphones;
  if (action === "user_suspended") return Ban;
  return History;
}

export default function AdminOverviewPage() {
  const { isSuperAdmin } = useAuth();
  const [data, setData] = useState<OverviewData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [users, listings, bookings, offers, payments, tickets, reports, verifications, logs] =
        await Promise.all([
          getAdminUserCount(),
          getAdminListings(),
          getAllBookings(),
          getAllOffers(),
          getAllPayments(),
          getSupportTickets(),
          getListingReports(),
          getVerificationRequests(),
          getAuditLogs(),
        ]);

      setData({
        users,
        suspendedUsers: null,
        listings,
        bookings,
        offers,
        payments: payments.length,
        supportTickets: tickets,
        reports,
        verificationRequests: verifications.length,
        auditLogs: logs,
      });

      if (isSuperAdmin) {
        try {
          const suspended = await getAdminUsers({ status: "suspended", pageSize: 1 });
          setData((current) => ({ ...current, suspendedUsers: suspended.meta.total }));
        } catch {
          // The suspended count is supplementary; leave it unavailable.
        }
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Marketplace totals could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingListings = useMemo(
    () => data.listings.filter((listing) => listing.status === "pending"),
    [data.listings],
  );

  const selectedListing = useMemo(() => {
    if (pendingListings.length === 0) return null;
    return pendingListings.find((listing) => listing.id === selectedListingId) ?? pendingListings[0];
  }, [pendingListings, selectedListingId]);

  const queuedListings = useMemo(
    () => pendingListings.filter((listing) => listing.id !== selectedListing?.id).slice(0, 3),
    [pendingListings, selectedListing],
  );

  const pendingBookings = countStatus(data.bookings, "pending");
  const pendingOffers = countStatus(data.offers, "pending");
  const openReports = countStatus(data.reports, "open");
  const openTickets = countStatus(data.supportTickets, "open");

  const kpis: KpiItem[] = [
    {
      label: "Users",
      value: formatCount(data.users),
      detail:
        data.suspendedUsers !== null
          ? `${data.suspendedUsers.toLocaleString()} suspended`
          : "Marketplace accounts",
      detailIcon: Ban,
    },
    {
      label: "Listings",
      value: formatCount(data.listings.length),
      detail: `${pendingListings.length.toLocaleString()} pending approval`,
      detailIcon: Clock,
    },
    {
      label: "Bookings",
      value: formatCount(data.bookings.length),
      detail: `${pendingBookings.toLocaleString()} pending confirmation`,
      detailIcon: Clock,
    },
    {
      label: "Offers",
      value: formatCount(data.offers.length),
      detail: `${pendingOffers.toLocaleString()} awaiting response`,
      detailIcon: Clock,
    },
  ];

  const queues = [
    {
      label: "Listings",
      sub: "Pending approval",
      count: pendingListings.length,
      href: "/admin/listings",
      icon: Car,
    },
    {
      label: "Verification",
      sub: "Awaiting review",
      count: data.verificationRequests,
      href: "/admin/verification",
      icon: ShieldCheck,
    },
    {
      label: "Reports",
      sub: "Open",
      count: openReports,
      href: "/admin/reports",
      icon: Flag,
    },
    {
      label: "Support",
      sub: "Open tickets",
      count: openTickets,
      href: "/admin/support",
      icon: Headphones,
    },
  ];

  const recentAudit = data.auditLogs.slice(0, 3);

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
      <PageHeader
        title="Overview"
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={13} aria-hidden="true" className={cx(loading && "animate-spin")} />
            Refresh totals
          </Button>
        }
      />

      {error ? (
        <Panel className="border-red-200 bg-red-50 px-4 py-3" aria-label="Load error">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-red-800">Marketplace data could not be loaded</p>
              <p className="mt-0.5 text-xs text-red-700">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw size={13} aria-hidden="true" />
              Try again
            </Button>
          </div>
        </Panel>
      ) : null}

      <KpiStrip items={kpis} loading={loading} failed={Boolean(error)} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_352px]">
        <Panel
          className="flex min-h-[360px] flex-col shadow-[0_1px_2px_rgba(6,40,29,0.04),0_10px_24px_-16px_rgba(6,40,29,0.28)]"
          aria-labelledby="pending-listings-title"
        >
          <PanelHeader
            title="Pending listings"
            count={
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11.5px] font-semibold text-brand tabular-nums">
                {loading ? "—" : pendingListings.length}
              </span>
            }
            action={
              <Link
                href="/admin/listings"
                className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                Open queue
                <ChevronRight size={13} aria-hidden="true" />
              </Link>
            }
          />

          {loading ? (
            <div className="flex-1 space-y-3 p-4" aria-hidden="true">
              <div className="h-28 animate-pulse rounded-lg bg-[#eef2ef]" />
              <div className="h-11 animate-pulse rounded-lg bg-[#f4f7f5]" />
              <div className="h-11 animate-pulse rounded-lg bg-[#f4f7f5]" />
            </div>
          ) : selectedListing ? (
            <>
              <div className="flex flex-col gap-3 bg-brand-soft/40 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                <img
                  src={selectedListing.coverImage}
                  alt={`${selectedListing.make} ${selectedListing.model} cover`}
                  loading="lazy"
                  decoding="async"
                  className="h-[104px] w-full rounded-lg object-cover sm:w-[148px] sm:shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
                      {selectedListing.make} {selectedListing.model} {selectedListing.year}
                    </h3>
                    <AdminStatusBadge status={selectedListing.status} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-muted">
                    <span>{selectedListing.location.city}</span>
                    <span>{selectedListing.ownerName}</span>
                    <span>{selectedListing.listingType === "buy" ? "For sale" : "For rent"}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-baseline gap-3">
                    <span className="text-base font-semibold text-ink tabular-nums">
                      {formatCurrencyAmount(selectedListing.price, selectedListing.currency)}
                    </span>
                    <span className="truncate font-mono text-[11px] text-subtle">
                      {selectedListing.id}
                    </span>
                  </div>
                </div>
              </div>

              <ul className="flex-1">
                {queuedListings.map((listing) => (
                  <li key={listing.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedListingId(listing.id)}
                      className="flex w-full items-center gap-3 border-b border-hairline-soft px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[#f7faf8]"
                    >
                      <img
                        src={listing.coverImage}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-[34px] w-[38px] shrink-0 rounded-[5px] object-cover"
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                        {listing.make} {listing.model} {listing.year}
                      </span>
                      <span className="hidden w-24 shrink-0 text-xs text-subtle sm:block">
                        {listing.location.city}
                      </span>
                      <span className="shrink-0 text-[13px] font-semibold text-ink tabular-nums">
                        {formatCurrencyAmount(listing.price, listing.currency)}
                      </span>
                      <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-[#b9c6bf]" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-hairline-soft px-4 py-3">
                <span className="text-xs text-subtle tabular-nums">
                  {Math.min(queuedListings.length + 1, pendingListings.length)} of{" "}
                  {pendingListings.length} in this queue
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    href="/admin/listings"
                    className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-[#eff3f1] hover:text-ink"
                  >
                    Open full queue
                  </Link>
                  <Link
                    href="/admin/listings"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-sm font-medium text-white transition-colors hover:bg-brand-strong"
                  >
                    Review listing
                    <ChevronRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              icon={Car}
              title="No listings waiting for approval"
              message="New submissions appear here as soon as sellers publish a vehicle."
            />
          )}
        </Panel>

        <Panel className="flex flex-col" aria-labelledby="queues-title">
          <PanelHeader title="Queues" />
          <ul className="flex-1">
            {queues.map((queue) => {
              const Icon = queue.icon;
              return (
                <li key={queue.href}>
                  <Link
                    href={queue.href}
                    className="flex items-center gap-3 border-b border-hairline-soft px-4 py-4 transition-colors last:border-b-0 hover:bg-[#f7faf8]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <Icon size={15} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">{queue.label}</span>
                      <span className="block text-xs text-subtle">{queue.sub}</span>
                    </span>
                    <span className="text-xl font-semibold tracking-[-0.02em] text-ink tabular-nums">
                      {loading || error ? "—" : queue.count.toLocaleString()}
                    </span>
                    <ChevronRight size={14} aria-hidden="true" className="text-[#b9c6bf]" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <Panel aria-labelledby="activity-title">
        <PanelHeader
          title="Administrative activity"
          action={
            <Link
              href="/admin/audit-logs"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              Full audit trail
              <ChevronRight size={13} aria-hidden="true" />
            </Link>
          }
        />
        {loading ? (
          <div className="space-y-2 p-4" aria-hidden="true">
            <div className="h-8 animate-pulse rounded-md bg-[#f4f7f5]" />
            <div className="h-8 animate-pulse rounded-md bg-[#f4f7f5]" />
          </div>
        ) : error ? (
          <EmptyState compact icon={History} title="Administrative activity unavailable" />
        ) : recentAudit.length === 0 ? (
          <EmptyState compact icon={History} title="No administrative activity yet" />
        ) : (
          <ul>
            {recentAudit.map((log) => {
              const Icon = actionIcon(log.action);
              return (
                <li
                  key={log.id}
                  className="grid grid-cols-1 items-center gap-1 border-b border-hairline-soft px-4 py-2.5 last:border-b-0 sm:grid-cols-[190px_minmax(0,1fr)_170px_110px] sm:gap-3"
                >
                  <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
                    <Icon size={14} aria-hidden="true" className="shrink-0 text-subtle" />
                    {log.action.replaceAll("_", " ")}
                  </span>
                  <span className="min-w-0 truncate text-[13px] text-muted">{log.description}</span>
                  <span className="truncate text-[13px] text-muted">{log.actorName}</span>
                  <span className="text-xs text-subtle tabular-nums sm:text-right">
                    {formatAuditStamp(log.createdAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
