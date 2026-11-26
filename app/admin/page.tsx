"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import Button from "@/Components/admin/Button";
import EmptyState from "@/Components/admin/EmptyState";
import KpiStrip, { type KpiItem } from "@/Components/admin/KpiStrip";
import PageHeader from "@/Components/admin/PageHeader";
import Panel, { PanelHeader } from "@/Components/admin/Panel";
import { cx } from "@/lib/classNames";
import { formatCount, formatCurrencyAmount } from "@/lib/format";
import { getAdminDashboardData, type AdminDashboardData } from "@/services/adminDashboardService";
import {
  Banknote,
  Building2,
  Car,
  Clock,
  Flag,
  Headphones,
  RefreshCw,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const EMPTY_DATA: AdminDashboardData = {
  counts: {
    users: 0,
    dealersPending: 0,
    vehiclesPending: 0,
    openReports: 0,
    openSupport: 0,
    bookings: 0,
    payments: 0,
    offers: 0,
  },
  pendingListings: [],
};

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminDashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAdminDashboardData());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The admin overview could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const primaryMetrics: KpiItem[] = [
    {
      label: "Registered accounts",
      value: formatCount(data.counts.users),
      detail: "Active and pending accounts",
      detailIcon: Users,
    },
    {
      label: "Listings awaiting review",
      value: formatCount(data.counts.vehiclesPending),
      detail: "Pending moderation",
      detailIcon: Car,
    },
    {
      label: "Dealer applications",
      value: formatCount(data.counts.dealersPending),
      detail: "Pending verification",
      detailIcon: Building2,
    },
    {
      label: "Open reports",
      value: formatCount(data.counts.openReports),
      detail: "Open or investigating",
      detailIcon: Flag,
    },
  ];

  const operationalMetrics: KpiItem[] = [
    {
      label: "Open support cases",
      value: formatCount(data.counts.openSupport),
      detail: "Open, in progress, or awaiting user",
      detailIcon: Headphones,
    },
    {
      label: "Booking records",
      value: formatCount(data.counts.bookings),
      detail: "All stored booking records",
      detailIcon: Clock,
    },
    {
      label: "Payment records",
      value: formatCount(data.counts.payments),
      detail: "Stored records; payment processing is not active",
      detailIcon: Banknote,
    },
    {
      label: "Offer records",
      value: formatCount(data.counts.offers),
      detail: "All stored offer records",
      detailIcon: Clock,
    },
  ];

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

      <KpiStrip items={primaryMetrics} loading={loading} failed={Boolean(error)} />
      <KpiStrip items={operationalMetrics} loading={loading} failed={Boolean(error)} />

      <Panel aria-labelledby="pending-listings-title">
        <PanelHeader
          title="Pending listings"
          count={
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11.5px] font-semibold text-brand tabular-nums">
              {loading || error ? "—" : data.counts.vehiclesPending.toLocaleString()}
            </span>
          }
          action={
            <Link
              href="/admin/listings"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              Open listing queue
            </Link>
          }
        />

        {loading ? (
          <div className="space-y-3 p-4" aria-hidden="true">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-12 animate-pulse rounded-lg bg-[#f4f7f5]" />
            ))}
          </div>
        ) : error ? (
          <EmptyState compact icon={Car} title="Pending listings could not be loaded" />
        ) : data.pendingListings.length === 0 ? (
          <EmptyState
            compact
            icon={Car}
            title="No listings waiting for approval"
            message="New submissions appear here after sellers send them for review."
          />
        ) : (
          <ul>
            {data.pendingListings.map((listing) => (
              <li key={listing.id}>
                <Link
                  href="/admin/listings"
                  className="flex flex-wrap items-center gap-3 border-b border-hairline-soft px-4 py-3 last:border-b-0 hover:bg-[#f7faf8]"
                >
                  <Image
                    src={listing.coverImage || "/images/easy-ride-hero.svg"}
                    width={128}
                    height={96}
                    unoptimized
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-12 w-16 shrink-0 rounded-md object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {listing.make} {listing.model} {listing.year}
                    </span>
                    <span className="block text-xs text-subtle">
                      {listing.location.city || "Location not provided"} · {listing.ownerName}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-ink tabular-nums">
                    {formatCurrencyAmount(listing.price, listing.currency)}
                  </span>
                  <AdminStatusBadge status={listing.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
