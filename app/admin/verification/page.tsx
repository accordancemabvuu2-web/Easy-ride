"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import Button from "@/Components/admin/Button";
import ConfirmDialog, {
  DialogTarget,
  DialogTransition,
} from "@/Components/admin/ConfirmDialog";
import EmptyState from "@/Components/admin/EmptyState";
import { SearchField, SelectField } from "@/Components/admin/Filters";
import PageHeader from "@/Components/admin/PageHeader";
import Panel, { PanelHeader } from "@/Components/admin/Panel";
import { useAuth } from "@/contexts/AuthContext";
import { cx } from "@/lib/classNames";
import {
  createAuditLog,
  createNotification,
  getDealers,
  getVerificationRequests,
  reviewVerificationRequest,
  updateDealerStatus,
} from "@/lib/clientFirebaseServices";
import { formatDateTime, humanize } from "@/lib/format";
import { updateUserRole } from "@/services/userService";
import type { Dealer } from "@/Types/dealer";
import type { VerificationRequest } from "@/Types/verification";
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  ExternalLink,
  FileText,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type Row = VerificationRequest & { dealer?: Dealer | null };

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

const TYPE_LABELS: Record<VerificationRequest["type"], string> = {
  identity: "Identity",
  private_seller: "Private seller",
  dealer: "Dealer",
};

function approvalLabel(type: VerificationRequest["type"]): string {
  if (type === "dealer") return "Approve dealer";
  if (type === "private_seller") return "Approve seller request";
  return "Approve identity";
}

function approvalOutcome(type: VerificationRequest["type"]): string {
  if (type === "dealer") {
    return "Approval marks the dealership verified, updates the linked dealer profile and records the decision in the audit trail.";
  }
  if (type === "private_seller") {
    return "Approval adds seller capability to the linked account and records the decision in the audit trail.";
  }
  return "Approval records the decision in the audit trail and notifies the account holder.";
}

export default function AdminVerificationPage() {
  const { profile, firebaseUser, isSuperAdmin } = useAuth();
  const [requests, setRequests] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | VerificationRequest["type"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Row | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async (options: { background?: boolean } = {}) => {
    if (options.background) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);

    try {
      const [raw, dealers] = await Promise.all([
        getVerificationRequests("pending"),
        getDealers("pending"),
      ]);
      setRequests(
        raw.map((request) => ({
          ...request,
          dealer: dealers.find((dealer) => dealer.ownerId === request.userId) ?? null,
        })),
      );
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Verification requests could not be loaded. Try again.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const actor = useMemo(
    () => ({
      actorId: firebaseUser?.uid ?? "system",
      actorName: profile?.name ?? "Administrator",
      actorRole: profile?.role ?? "admin",
    }),
    [firebaseUser?.uid, profile?.name, profile?.role],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesType = typeFilter === "all" || request.type === typeFilter;
      const matchesQuery =
        !term ||
        [request.userName, request.userEmail, request.notes ?? "", request.type, request.status].some(
          (value) => value.toLowerCase().includes(term),
        );
      return matchesType && matchesQuery;
    });
  }, [requests, query, typeFilter]);

  const selected = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered.find((request) => request.id === selectedId) ?? filtered[0];
  }, [filtered, selectedId]);

  const approve = async (request: Row) => {
    setSubmitting(true);
    setActionError(null);
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
      setSelectedId(null);
      setMobileDetailOpen(false);
      await load({ background: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Verification could not be approved.";
      setActionError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const reject = async (request: Row, reason: string) => {
    setSubmitting(true);
    setActionError(null);
    try {
      await reviewVerificationRequest(
        request.id,
        "rejected",
        actor.actorId,
        actor.actorName,
        reason,
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
        message: reason,
        actionUrl: "/verification",
        link: "/verification",
      });

      toast.success("Verification rejected.");
      setRejectTarget(null);
      setSelectedId(null);
      setMobileDetailOpen(false);
      await load({ background: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Verification could not be rejected.";
      setActionError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const documents = selected
    ? [
        { label: "Government-issued ID", url: selected.identityDocumentUrl },
        { label: "Proof of address", url: selected.proofOfAddressUrl },
        { label: "Business registration document", url: selected.businessDocumentUrl },
      ].filter((document): document is { label: string; url: string } => Boolean(document.url))
    : [];

  return (
    <>
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
        <PageHeader
          title="Verification"
          meta={`${requests.length.toLocaleString()} requests pending`}
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
            id="verification-search"
            label="Search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, email or request ID"
          />
          <SelectField
            id="verification-type"
            label="Request type"
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value as typeof typeFilter);
              setSelectedId(null);
            }}
          >
            <option value="all">All types</option>
            <option value="identity">Identity</option>
            <option value="private_seller">Private seller</option>
            <option value="dealer">Dealer</option>
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
                <p className="text-sm font-semibold text-red-800">
                  Verification requests could not be loaded
                </p>
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
            <div className="h-[480px] animate-pulse rounded-xl bg-surface" />
            <div className="h-[480px] animate-pulse rounded-xl bg-surface" />
          </div>
        ) : requests.length === 0 ? (
          <Panel>
            <EmptyState
              icon={ShieldCheck}
              title="No pending verification requests"
              message="Identity, private seller and dealer submissions appear here for review."
            />
          </Panel>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[352px_minmax(0,1fr)]">
            <Panel
              className={cx("flex flex-col overflow-hidden", mobileDetailOpen && "hidden lg:flex")}
              aria-label="Verification requests"
            >
              <PanelHeader
                title="Pending requests"
                count={
                  <span className="text-xs text-subtle tabular-nums">
                    {requests.length.toLocaleString()} requests
                  </span>
                }
              />

              {filtered.length === 0 ? (
                <EmptyState
                  compact
                  title="No requests match this filter"
                  message="Try a different request type."
                />
              ) : (
                <ul className="max-h-[520px] overflow-y-auto">
                  {filtered.map((request) => {
                    const isSelected = selected?.id === request.id;
                    return (
                      <li key={request.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(request.id);
                            setMobileDetailOpen(true);
                          }}
                          aria-current={isSelected ? "true" : undefined}
                          className={cx(
                            "flex w-full items-center gap-2.5 border-b border-hairline-soft px-3.5 py-3 text-left transition-colors",
                            isSelected
                              ? "bg-brand-soft/60 shadow-[inset_0_0_0_1px_var(--color-brand-line)]"
                              : "hover:bg-[#f7faf8]",
                          )}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-medium text-ink">
                              {request.userName}
                            </span>
                            <span className="mt-0.5 block truncate text-[11.5px] text-subtle">
                              {request.userEmail}
                            </span>
                          </span>
                          <span className="shrink-0 text-[11.5px] text-muted">
                            {TYPE_LABELS[request.type]}
                          </span>
                          <ChevronRight
                            size={13}
                            aria-hidden="true"
                            className={cx("shrink-0", isSelected ? "text-brand" : "text-[#b9c6bf]")}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-auto border-t border-hairline-soft px-3.5 py-2.5 text-xs text-subtle tabular-nums">
                1–{filtered.length} of {requests.length}
              </div>
            </Panel>

            {selected ? (
              <Panel
                className={cx("flex flex-col overflow-hidden", !mobileDetailOpen && "hidden lg:flex")}
                aria-label="Selected request"
              >
                <div className="flex flex-wrap items-center gap-3 border-b border-hairline-soft px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setMobileDetailOpen(false)}
                    aria-label="Back to requests"
                    className="-ml-1 flex h-7 w-7 items-center justify-center rounded-md text-muted hover:bg-[#eff3f1] lg:hidden"
                  >
                    <ArrowLeft size={15} aria-hidden="true" />
                  </button>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand">
                    {selected.userName.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-lg font-semibold tracking-[-0.015em] text-ink">
                        {selected.userName}
                      </h2>
                      <AdminStatusBadge
                        status={selected.type}
                        label={TYPE_LABELS[selected.type]}
                      />
                      <AdminStatusBadge status={selected.status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-subtle">{selected.userEmail}</p>
                  </div>
                  <span className="font-mono text-[11px] text-subtle">
                    Request {selected.id.slice(0, 8)}
                  </span>
                </div>

                <div className="flex flex-col gap-4 p-4">
                  <div>
                    <p className="mb-1 text-xs font-semibold text-ink">Request</p>
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-3">
                      <div className="min-w-0">
                        <dt className="text-[11.5px] text-subtle">Request ID</dt>
                        <dd className="mt-0.5 break-all font-mono text-[11.5px] text-ink">
                          {selected.id}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[11.5px] text-subtle">Type</dt>
                        <dd className="mt-0.5 text-[13.5px] text-ink">
                          {TYPE_LABELS[selected.type]}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[11.5px] text-subtle">Submitted</dt>
                        <dd className="mt-0.5 text-[13.5px] text-ink">
                          {formatDateTime(selected.submittedAt)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {selected.notes ? (
                    <div>
                      <p className="mb-1 text-xs font-semibold text-ink">Applicant notes</p>
                      <p className="max-w-2xl border-l-2 border-brand-line pl-3 text-[13px] leading-6 text-muted">
                        {selected.notes}
                      </p>
                    </div>
                  ) : null}

                  <div>
                    <p className="mb-1 text-xs font-semibold text-ink">Linked account</p>
                    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-hairline bg-[#fafbfa] px-3.5 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
                        {selected.userName.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium text-ink">
                          {selected.userName}
                        </p>
                        <p className="truncate text-[11.5px] text-subtle">
                          {selected.userEmail}
                        </p>
                      </div>
                      <span className="font-mono text-[11px] text-subtle">{selected.userId}</span>
                      {isSuperAdmin && OBJECT_ID_PATTERN.test(selected.userId) ? (
                        <Link
                          href={`/admin/users/${encodeURIComponent(selected.userId)}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                        >
                          Open account
                          <ChevronRight size={12} aria-hidden="true" />
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  {documents.length > 0 ? (
                    <div>
                      <p className="mb-1 text-xs font-semibold text-ink">Documents submitted</p>
                      <ul className="divide-y divide-hairline-soft rounded-lg border border-hairline">
                        {documents.map((document) => (
                          <li
                            key={document.label}
                            className="flex items-center gap-2.5 px-3.5 py-2.5 text-[13px]"
                          >
                            <FileText size={14} aria-hidden="true" className="text-subtle" />
                            <span className="flex-1 text-ink">{document.label}</span>
                            <a
                              href={document.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                            >
                              Open
                              <ExternalLink size={12} aria-hidden="true" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {selected.type === "dealer" ? (
                    <div>
                      <p className="mb-1 text-xs font-semibold text-ink">Dealer profile</p>
                      {selected.dealer ? (
                        <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 rounded-lg border border-hairline px-3.5 py-3 sm:grid-cols-2">
                          <div className="min-w-0">
                            <dt className="text-[11.5px] text-subtle">Business name</dt>
                            <dd className="mt-0.5 truncate text-[13.5px] text-ink">
                              {selected.dealer.businessName}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[11.5px] text-subtle">Registration number</dt>
                            <dd className="mt-0.5 truncate text-[13.5px] text-ink">
                              {selected.dealer.registrationNumber || "Not provided"}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[11.5px] text-subtle">Contact email</dt>
                            <dd className="mt-0.5 truncate text-[13.5px] text-ink">
                              {selected.dealer.email || "Not provided"}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-[11.5px] text-subtle">Dealer status</dt>
                            <dd className="mt-1">
                              <AdminStatusBadge status={selected.dealer.status} />
                            </dd>
                          </div>
                        </dl>
                      ) : (
                        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5">
                          <Building2 size={15} aria-hidden="true" className="mt-0.5 text-amber-700" />
                          <p className="text-xs leading-5 text-amber-900">
                            No dealer profile is linked to this request. The account was not marked as
                            verified by this screen.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="rounded-lg border border-brand-line bg-brand-soft px-3.5 py-2.5">
                    <p className="text-xs font-semibold text-ink">What approval does</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted">
                      {approvalOutcome(selected.type)}
                    </p>
                  </div>

                  {actionError ? (
                    <p role="alert" className="text-xs text-danger-ink">
                      {actionError}
                    </p>
                  ) : null}
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-hairline px-4 py-3">
                  <span className="font-mono text-[11px] text-subtle">
                    Request {selected.id.slice(0, 8)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setActionError(null);
                        setRejectTarget(selected);
                      }}
                      disabled={submitting}
                    >
                      Reject request
                    </Button>
                    <Button onClick={() => void approve(selected)} disabled={submitting}>
                      <ShieldCheck size={14} aria-hidden="true" />
                      {approvalLabel(selected.type)}
                    </Button>
                  </div>
                </div>
              </Panel>
            ) : null}
          </div>
        )}
      </div>

      {rejectTarget ? (
        <ConfirmDialog
          title="Reject verification request"
          description="The applicant is notified with the reason you provide."
          tone="danger"
          confirmLabel="Reject request"
          submitting={submitting}
          submitError={actionError ? { message: actionError } : null}
          onCancel={() => {
            if (submitting) return;
            setRejectTarget(null);
            setActionError(null);
          }}
          onConfirm={(reason) => void reject(rejectTarget, reason)}
          reason={{
            label: "Reason for rejection",
            help: "The applicant sees this reason in their notification.",
            placeholder: "Explain what is missing or unclear in the submitted documents",
          }}
        >
          <DialogTarget
            name={rejectTarget.userName}
            email={rejectTarget.userEmail}
            id={rejectTarget.id}
          />
          <div className="mt-3">
            <DialogTransition
              from={{ label: "Current status", text: humanize(rejectTarget.status), tone: "warning" }}
              to={{ label: "After confirmation", text: "Rejected", tone: "danger" }}
            />
          </div>
        </ConfirmDialog>
      ) : null}
    </>
  );
}
