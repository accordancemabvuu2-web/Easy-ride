"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import Button from "@/Components/admin/Button";
import ConfirmDialog, {
  DialogTarget,
  DialogTransition,
  type DialogPillTone,
} from "@/Components/admin/ConfirmDialog";
import EmptyState from "@/Components/admin/EmptyState";
import { SearchField, SelectField } from "@/Components/admin/Filters";
import PageHeader from "@/Components/admin/PageHeader";
import Panel, { PanelHeader } from "@/Components/admin/Panel";
import { cx } from "@/lib/classNames";
import {
  createNotification,
  getAdminListings,
  updateListingStatus,
} from "@/lib/clientFirebaseServices";
import { formatCurrencyAmount, formatDateTime, humanize } from "@/lib/format";
import type { Vehicle } from "@/Types/vehicle";
import {
  ArrowLeft,
  Ban,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type PendingAction = { kind: "reject" | "suspend"; listing: Vehicle };

function countStatus(listings: Vehicle[], status: string): number {
  return listings.filter((listing) => listing.status === status).length;
}

function statusTone(status: string): DialogPillTone {
  if (status === "active") return "success";
  if (status === "pending" || status === "under_review") return "warning";
  if (status === "rejected" || status === "suspended") return "danger";
  return "neutral";
}

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [typeFilter, setTypeFilter] = useState<"all" | "buy" | "rent">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async (options: { background?: boolean } = {}) => {
    if (options.background) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);

    try {
      const next = await getAdminListings();
      setListings(next);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Listings could not be loaded. Try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return listings.filter((listing) => {
      const matchesStatus = statusFilter === "all" || listing.status === statusFilter;
      const matchesType = typeFilter === "all" || listing.listingType === typeFilter;
      const matchesQuery =
        !term ||
        [
          listing.make,
          listing.model,
          String(listing.year),
          listing.ownerName,
          listing.ownerPhone,
          listing.location.address,
          listing.location.city,
          listing.status,
          listing.listingType,
        ].some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesType && matchesQuery;
    });
  }, [listings, query, statusFilter, typeFilter]);

  const selected = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered.find((listing) => listing.id === selectedId) ?? filtered[0];
  }, [filtered, selectedId]);

  const pendingCount = countStatus(listings, "pending");

  const approve = async (listing: Vehicle) => {
    setActionSubmitting(true);
    setActionError(null);
    try {
      await updateListingStatus(listing.id, "active");
      await createNotification({
        userId: listing.ownerId,
        type: "listing",
        title: "Listing approved",
        message: `${listing.make} ${listing.model} ${listing.year} is now live on Easy Ride.`,
        actionUrl: `/vehicle/${listing.id}`,
        link: `/vehicle/${listing.id}`,
      });
      toast.success("Listing approved.");
      setPendingAction(null);
      setSelectedId(null);
      await load({ background: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Listing could not be approved.";
      setActionError(message);
      toast.error(message);
    } finally {
      setActionSubmitting(false);
    }
  };

  const reject = async (listing: Vehicle, reason: string) => {
    setActionSubmitting(true);
    setActionError(null);
    try {
      await updateListingStatus(listing.id, "rejected", reason);
      await createNotification({
        userId: listing.ownerId,
        type: "listing",
        title: "Listing rejected",
        message: `${listing.make} ${listing.model} ${listing.year} was rejected: ${reason}`,
        actionUrl: "/dashboard",
        link: "/dashboard",
      });
      toast.success("Listing rejected.");
      setPendingAction(null);
      setSelectedId(null);
      await load({ background: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Listing could not be rejected.";
      setActionError(message);
      toast.error(message);
    } finally {
      setActionSubmitting(false);
    }
  };

  const suspend = async (listing: Vehicle, reason: string) => {
    setActionSubmitting(true);
    setActionError(null);
    try {
      await updateListingStatus(listing.id, "suspended", reason);
      toast.success("Listing suspended.");
      setPendingAction(null);
      await load({ background: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Listing could not be suspended.";
      setActionError(message);
      toast.error(message);
    } finally {
      setActionSubmitting(false);
    }
  };

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
        <PageHeader
          title="Listings"
          meta={`${pendingCount.toLocaleString()} pending of ${listings.length.toLocaleString()} listings`}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load({ background: true })}
              disabled={loading || refreshing}
            >
              <RefreshCw
                size={13}
                aria-hidden="true"
                className={cx(refreshing && "animate-spin")}
              />
              Refresh
            </Button>
          }
        />

        <Panel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <SearchField
            id="listing-search"
            label="Search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Make, model, seller, location or listing ID"
          />
          <SelectField
            id="listing-status"
            label="Status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setSelectedId(null);
            }}
          >
            <option value="pending">Pending</option>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="rejected">Rejected</option>
            <option value="sold">Sold</option>
            <option value="rented">Rented</option>
            <option value="draft">Draft</option>
          </SelectField>
          <SelectField
            id="listing-type"
            label="Listing type"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
          >
            <option value="all">All types</option>
            <option value="buy">For sale</option>
            <option value="rent">For rent</option>
          </SelectField>
          <div className="shrink-0 pb-0.5 sm:pb-0">
            <span className="whitespace-nowrap px-1 text-xs text-subtle tabular-nums">
              {filtered.length.toLocaleString()} results
            </span>
          </div>
        </Panel>

        {loadError ? (
          <Panel className="border-red-200 bg-red-50 px-4 py-3" aria-label="Load error">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-red-800">Listings could not be loaded</p>
                <p className="mt-0.5 text-xs text-red-700">{loadError}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void load()}>
                <RefreshCw size={13} aria-hidden="true" />
                Try again
              </Button>
            </div>
          </Panel>
        ) : null}

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-[352px_minmax(0,1fr)]">
            <div className="h-[520px] animate-pulse rounded-xl bg-surface" />
            <div className="h-[520px] animate-pulse rounded-xl bg-surface" />
          </div>
        ) : filtered.length === 0 ? (
          <Panel>
            <EmptyState
              icon={Car}
              title="No listings match these filters"
              message="Adjust the status, listing type or search term to see other vehicles."
            />
          </Panel>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[352px_minmax(0,1fr)]">
            <Panel
              className={cx("flex flex-col overflow-hidden", mobileDetailOpen && "hidden lg:flex")}
              aria-label="Listings queue"
            >
              <PanelHeader
                title={statusFilter === "pending" ? "Pending review" : "Listings"}
                count={
                  <span className="text-xs text-subtle tabular-nums">
                    {filtered.length.toLocaleString()} listings
                  </span>
                }
              />

              <ul className="max-h-[560px] overflow-y-auto">
                {filtered.map((listing) => {
                  const isSelected = selected?.id === listing.id;
                  return (
                    <li key={listing.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(listing.id);
                          setMobileDetailOpen(true);
                        }}
                        aria-current={isSelected ? "true" : undefined}
                        className={cx(
                          "flex w-full items-center gap-3 border-b border-hairline-soft px-3.5 py-3 text-left transition-colors",
                          isSelected
                            ? "bg-brand-soft/60 shadow-[inset_0_0_0_1px_var(--color-brand-line)]"
                            : "hover:bg-[#f7faf8]",
                        )}
                      >
                        <img
                          src={listing.coverImage}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-16 w-[60px] shrink-0 rounded-md object-cover"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium text-ink">
                            {listing.make} {listing.model} {listing.year}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-subtle">
                            {listing.location.city} · {listing.ownerName}
                          </span>
                          <span className="mt-1 block text-[13px] font-semibold text-ink tabular-nums">
                            {formatCurrencyAmount(listing.price, listing.currency)}
                          </span>
                        </span>
                        {isSelected ? (
                          <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                            <Check size={10} aria-hidden="true" />
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-auto flex items-center justify-between border-t border-hairline-soft px-3.5 py-2.5 text-xs text-subtle">
                <span className="tabular-nums">
                  1–{filtered.length} of {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled
                    aria-label="Previous page"
                    className="flex h-6.5 w-6.5 items-center justify-center rounded-md border border-hairline text-[#b9c6bf]"
                  >
                    <ChevronLeft size={13} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled
                    aria-label="Next page"
                    className="flex h-6.5 w-6.5 items-center justify-center rounded-md border border-hairline text-[#b9c6bf]"
                  >
                    <ChevronRight size={13} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </Panel>

            {selected ? (
              <Panel
                className={cx("flex flex-col overflow-hidden", !mobileDetailOpen && "hidden lg:flex")}
                aria-label="Selected listing"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline-soft px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMobileDetailOpen(false)}
                      aria-label="Back to queue"
                      className="-ml-1 flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-[#eff3f1] lg:hidden"
                    >
                      <ArrowLeft size={15} aria-hidden="true" />
                    </button>
                    <div className="min-w-0">
                      <h2 className="truncate text-[19px] font-semibold tracking-[-0.015em] text-ink">
                        {selected.make} {selected.model} {selected.year}
                      </h2>
                      <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-subtle">
                        <span className="font-mono">Listing {selected.id.slice(0, 8)}</span>
                        <span>Submitted {formatDateTime(selected.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <AdminStatusBadge status={selected.status} />
                </div>

                <div className="flex flex-col gap-3 p-4">
                  <img
                    src={selected.coverImage}
                    alt={`${selected.make} ${selected.model} cover`}
                    loading="lazy"
                    decoding="async"
                    className="h-[220px] w-full rounded-lg object-cover sm:h-[272px]"
                  />

                  <div className="flex flex-wrap gap-1.5">
                    {[
                      String(selected.year),
                      `${selected.mileage.toLocaleString()} km`,
                      selected.transmission,
                      selected.fuelType,
                      `${selected.condition} condition`,
                      selected.bodyType,
                    ]
                      .filter(Boolean)
                      .map((spec) => (
                        <span
                          key={spec}
                          className="inline-flex h-6 items-center rounded-md border border-hairline bg-[#fafbfa] px-2 text-xs text-muted"
                        >
                          {spec}
                        </span>
                      ))}
                  </div>

                  <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-3">
                    {[
                      {
                        label: "Price",
                        value: `${formatCurrencyAmount(selected.price, selected.currency)} ${selected.currency}`,
                      },
                      {
                        label: "Listing type",
                        value: selected.listingType === "buy" ? "For sale" : "For rent",
                      },
                      {
                        label: "Seller",
                        value: `${selected.ownerName}, ${selected.sellerType.toLowerCase()}`,
                      },
                      { label: "Seller phone", value: selected.ownerPhone },
                      {
                        label: "Location",
                        value: `${selected.location.address}, ${selected.location.city}`,
                      },
                      { label: "Listing ID", value: selected.id },
                    ].map((field) => (
                      <div key={field.label} className="min-w-0">
                        <dt className="text-[11.5px] text-subtle">{field.label}</dt>
                        <dd
                          className={cx(
                            "mt-0.5 truncate text-[13.5px] text-ink",
                            field.label === "Listing ID" && "font-mono text-xs",
                          )}
                          title={field.value}
                        >
                          {field.value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {selected.description ? (
                    <div>
                      <p className="text-[11.5px] text-subtle">Seller description</p>
                      <p className="mt-1 max-w-2xl text-[13px] leading-6 text-muted">
                        {selected.description}
                      </p>
                    </div>
                  ) : null}

                  {actionError ? (
                    <p role="alert" className="text-xs text-danger-ink">
                      {actionError}
                    </p>
                  ) : null}
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-hairline px-4 py-3">
                  <Button
                    variant="quiet"
                    className="text-danger-ink hover:bg-[#fbebe9] hover:text-danger-ink"
                    onClick={() => {
                      setActionError(null);
                      setPendingAction({ kind: "suspend", listing: selected });
                    }}
                    disabled={actionSubmitting}
                  >
                    <Ban size={14} aria-hidden="true" />
                    Suspend listing
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setActionError(null);
                        setPendingAction({ kind: "reject", listing: selected });
                      }}
                      disabled={actionSubmitting}
                    >
                      Reject
                    </Button>
                    <Button
                      onClick={() => void approve(selected)}
                      disabled={actionSubmitting}
                    >
                      <Check size={14} aria-hidden="true" />
                      Approve listing
                    </Button>
                  </div>
                </div>
              </Panel>
            ) : null}
          </div>
        )}
      </div>

      {pendingAction?.kind === "reject" ? (
        <ConfirmDialog
          title="Reject listing"
          description="The seller is notified with the reason you provide."
          tone="danger"
          confirmLabel="Reject listing"
          submitting={actionSubmitting}
          submitError={actionError ? { message: actionError } : null}
          onCancel={() => {
            if (actionSubmitting) return;
            setPendingAction(null);
            setActionError(null);
          }}
          onConfirm={(reason) => void reject(pendingAction.listing, reason)}
          reason={{
            label: "Reason for rejection",
            help: "The seller sees this reason in their notification.",
            placeholder: "Explain what needs to change before the listing can go live",
          }}
        >
          <DialogTarget
            name={`${pendingAction.listing.make} ${pendingAction.listing.model} ${pendingAction.listing.year}`}
            email={pendingAction.listing.ownerName}
            id={pendingAction.listing.id}
          />
          <div className="mt-3">
            <DialogTransition
              from={{
                label: "Current status",
                text: humanize(pendingAction.listing.status),
                tone: statusTone(pendingAction.listing.status),
              }}
              to={{ label: "After confirmation", text: "Rejected", tone: "danger" }}
            />
          </div>
        </ConfirmDialog>
      ) : null}

      {pendingAction?.kind === "suspend" ? (
        <ConfirmDialog
          title="Suspend listing"
          description="The listing is removed from the marketplace until it is restored."
          tone="danger"
          confirmLabel="Suspend listing"
          submitting={actionSubmitting}
          submitError={actionError ? { message: actionError } : null}
          onCancel={() => {
            if (actionSubmitting) return;
            setPendingAction(null);
            setActionError(null);
          }}
          onConfirm={(reason) => void suspend(pendingAction.listing, reason)}
          reason={{
            label: "Reason for suspension",
            help: "This reason is recorded with the listing moderation action.",
            placeholder: "Explain why this listing is being removed from the marketplace",
          }}
        >
          <DialogTarget
            name={`${pendingAction.listing.make} ${pendingAction.listing.model} ${pendingAction.listing.year}`}
            email={pendingAction.listing.ownerName}
            id={pendingAction.listing.id}
          />
          <div className="mt-3">
            <DialogTransition
              from={{
                label: "Current status",
                text: humanize(pendingAction.listing.status),
                tone: statusTone(pendingAction.listing.status),
              }}
              to={{ label: "After confirmation", text: "Suspended", tone: "danger" }}
            />
          </div>
        </ConfirmDialog>
      ) : null}
    </>
  );
}
