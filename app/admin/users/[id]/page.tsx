"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import Button from "@/Components/admin/Button";
import ConfirmDialog, {
  DialogTarget,
  DialogTransition,
  type DialogPillTone,
} from "@/Components/admin/ConfirmDialog";
import EmptyState from "@/Components/admin/EmptyState";
import Panel, { PanelHeader } from "@/Components/admin/Panel";
import Tabs from "@/Components/admin/Tabs";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/apiClient";
import { cx } from "@/lib/classNames";
import { getAdminUserDetails, updateAdminUserStatus } from "@/lib/clientFirebaseServices";
import { humanize, initials } from "@/lib/format";
import type {
  AdminAccountStatus,
  AdminDealerProfileDetails,
  AdminUserDetailsAccount,
  AdminUserDetailsResponse,
} from "@/Types/user";
import { ADMIN_USERS_INVALIDATED_EVENT } from "@/Types/user";
import {
  ArrowLeft,
  Ban,
  Building2,
  CheckCircle2,
  CircleAlert,
  History,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import toast from "react-hot-toast";

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

function normalizeAccountId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return OBJECT_ID_PATTERN.test(normalized) ? normalized : null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

type DetailErrorKind = "invalid" | "not-found" | "unauthorized" | "forbidden" | "request";
type DetailError = { kind: DetailErrorKind; message: string };

type StatusChangeErrorKind = "invalid" | "unauthorized" | "forbidden" | "not-found" | "conflict" | "request";
type StatusChangeError = { kind: StatusChangeErrorKind; message: string };

function toDetailError(error: unknown): DetailError {
  if (error instanceof ApiError) {
    if (error.statusCode === 400) return { kind: "invalid", message: "This user ID is not valid." };
    if (error.statusCode === 401) {
      return { kind: "unauthorized", message: "Your session could not be verified. Sign in again to continue." };
    }
    if (error.statusCode === 403) {
      return { kind: "forbidden", message: "Only a super administrator can view user details." };
    }
    if (error.statusCode === 404) {
      return { kind: "not-found", message: "No user was found for this ID." };
    }
  }

  return {
    kind: "request",
    message: "User details could not be loaded. Check your connection and try again.",
  };
}

function toStatusChangeError(error: unknown): StatusChangeError {
  if (error instanceof ApiError) {
    switch (error.statusCode) {
      case 400:
        return { kind: "invalid", message: "Enter a valid reason of 1–1,000 characters and try again." };
      case 401:
        return {
          kind: "unauthorized",
          message: "Your session expired or is missing. Sign in again before making this change.",
        };
      case 403:
        return {
          kind: "forbidden",
          message: "Your account does not have permission to change this account status.",
        };
      case 404:
        return {
          kind: "not-found",
          message: "This account no longer exists. Refresh its details before continuing.",
        };
      case 409:
        return {
          kind: "conflict",
          message: "This account may have changed since you opened it. Refresh its details before trying again.",
        };
    }
  }

  return {
    kind: "request",
    message: "The account status could not be changed due to a server or network problem. Try again.",
  };
}

function accountClassification(
  user: AdminUserDetailsAccount,
  dealerProfile: AdminDealerProfileDetails | null,
): { badgeStatus: string; label: string } {
  if (user.role === "admin" || user.adminRole) {
    return {
      badgeStatus: "admin",
      label: user.adminRole === "super_admin" ? "Super administrator" : "Administrator",
    };
  }

  if (user.accountType === "dealer" || user.role === "dealer") {
    const verificationStatus = dealerProfile?.verificationStatus;
    if (verificationStatus === "verified") return { badgeStatus: "approved", label: "Approved dealer" };
    if (verificationStatus === "rejected") {
      return { badgeStatus: "rejected", label: "Dealer application rejected" };
    }
    if (verificationStatus === "suspended") return { badgeStatus: "suspended", label: "Dealer suspended" };
    if (verificationStatus === "pending" || verificationStatus === "under_review") {
      return { badgeStatus: verificationStatus, label: "Pending dealer" };
    }
    if (user.role === "dealer") return { badgeStatus: "approved", label: "Approved dealer" };
    if (user.accountType === "dealer") return { badgeStatus: "pending", label: "Pending dealer" };
  }

  if (user.accountType === "seller") return { badgeStatus: "seller", label: "Individual seller" };
  if (user.accountType === "buyer") return { badgeStatus: "buyer", label: "Buyer" };
  return { badgeStatus: "user", label: "Account type unavailable" };
}

function accountRoleLabel(role: AdminUserDetailsAccount["role"]): string {
  switch (role) {
    case "admin":
      return "Administrator";
    case "dealer":
      return "Dealer";
    default:
      return "Marketplace user";
  }
}

function accountTypeLabel(user: AdminUserDetailsAccount, classificationLabel: string): string {
  if (user.role === "admin" || user.adminRole) return classificationLabel;
  if (!user.accountType) return "Not provided";
  return user.accountType === "seller"
    ? "Individual seller"
    : user.accountType[0].toUpperCase() + user.accountType.slice(1);
}

function adminRoleLabel(adminRole: AdminUserDetailsAccount["adminRole"]): string {
  if (!adminRole) return "Not applicable";
  if (adminRole === "super_admin") return "Super administrator";
  return adminRole[0].toUpperCase() + adminRole.slice(1);
}

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed || "Not provided";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function FieldRow({
  label,
  value,
  wrap,
}: {
  label: string;
  value: ReactNode;
  wrap?: boolean;
}) {
  return (
    <div className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-4 border-b border-hairline-soft py-2.5 text-sm last:border-b-0">
      <dt className="text-xs text-subtle">{label}</dt>
      <dd className={cx("min-w-0 text-ink", wrap ? "break-all" : "truncate")}>{value}</dd>
    </div>
  );
}

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-1 text-[13px] font-semibold text-ink">{title}</h3>
      <dl>{children}</dl>
    </div>
  );
}

function DetailState({
  title,
  message,
  icon,
  action,
}: {
  title: string;
  message: string;
  icon: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Panel className="px-6 py-12 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
        {icon}
      </span>
      <h1 className="mt-3 text-xl font-semibold text-ink">{title}</h1>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-muted">{message}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </Panel>
  );
}

function DealerProfilePanel({ profile }: { profile: AdminDealerProfileDetails }) {
  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelHeader title="Dealer profile" />
        <div className="grid gap-x-8 px-4 py-2 md:grid-cols-2">
          <FieldRow label="Dealership name" value={profile.businessName} wrap />
          <FieldRow label="Registration number" value={displayValue(profile.businessRegistrationNumber)} />
          <FieldRow label="Business email" value={displayValue(profile.contactEmail)} wrap />
          <FieldRow label="Business phone" value={displayValue(profile.contactPhone)} />
          <FieldRow label="Address" value={displayValue(profile.address)} wrap />
          <FieldRow
            label="Verification"
            value={<AdminStatusBadge status={profile.verificationStatus} />}
          />
          <FieldRow label="Profile created" value={formatDate(profile.createdAt)} />
          <FieldRow label="Last updated" value={formatDate(profile.updatedAt)} />
          {profile.verificationReason ? (
            <div className="md:col-span-2">
              <FieldRow label="Latest reason" value={profile.verificationReason} wrap />
            </div>
          ) : null}
        </div>
      </Panel>

      <Panel>
        <PanelHeader title="Dealer decision history" />
        {profile.verificationHistory.length === 0 ? (
          <EmptyState compact icon={History} title="No dealer decisions recorded" />
        ) : (
          <ul>
            {profile.verificationHistory.map((decision, index) => {
              const approved = decision.action === "dealer.approve";
              return (
                <li
                  key={`${decision.action}-${decision.timestamp}-${index}`}
                  className="border-b border-hairline-soft px-4 py-3 last:border-b-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AdminStatusBadge
                        status={approved ? "approved" : "rejected"}
                        label={approved ? "Approved" : "Rejected"}
                      />
                      <span className="text-sm font-medium text-ink">Dealer application</span>
                    </div>
                    <time className="text-xs text-subtle" dateTime={decision.timestamp}>
                      {formatDate(decision.timestamp)}
                    </time>
                  </div>
                  <p className="mt-1.5 text-xs text-subtle">
                    Actor ID: {decision.actorId ?? "Not recorded"}
                  </p>
                  {decision.reason ? (
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-muted">
                      {decision.reason}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function ActivityPanel({ details }: { details: AdminUserDetailsResponse["data"]["activitySummary"] }) {
  const groups: Array<{ label: string; items: Array<{ label: string; value: number }> }> = [
    {
      label: "Vehicle listings",
      items: [
        { label: "Total", value: details.vehicles.total },
        { label: "Active", value: details.vehicles.active },
        { label: "Sold", value: details.vehicles.sold },
      ],
    },
    {
      label: "Bookings",
      items: [
        { label: "As buyer", value: details.bookings.asBuyer },
        { label: "As seller", value: details.bookings.asSeller },
      ],
    },
    {
      label: "Offers",
      items: [
        { label: "As buyer", value: details.offers.asBuyer },
        { label: "As seller", value: details.offers.asSeller },
      ],
    },
  ];

  return (
    <Panel>
      <PanelHeader title="Marketplace activity" />
      <div>
        {groups.map((group) => (
          <div
            key={group.label}
            className="grid grid-cols-1 gap-2 border-b border-hairline-soft px-4 py-3 last:border-b-0 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center sm:gap-4"
          >
            <p className="text-xs text-subtle">{group.label}</p>
            <dl className="flex flex-wrap gap-x-8 gap-y-2">
              {group.items.map((item) => (
                <div key={item.label} className="flex items-baseline gap-2">
                  <dt className="text-xs text-muted">{item.label}</dt>
                  <dd className="text-sm font-semibold text-ink tabular-nums">
                    {item.value.toLocaleString()}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-label="Loading account details">
      <div className="h-32 animate-pulse rounded-xl bg-surface" />
      <div className="h-10 w-64 animate-pulse rounded-lg bg-[#e9eeeb]" />
      <div className="h-64 animate-pulse rounded-xl bg-surface" />
      <span className="sr-only">Loading account details…</span>
    </div>
  );
}

export default function AdminUserDetailsPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const validUserId = typeof userId === "string" && OBJECT_ID_PATTERN.test(userId);
  const { isSuperAdmin, user: authUser, profile } = useAuth();
  const [details, setDetails] = useState<AdminUserDetailsResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<DetailError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!isSuperAdmin || !validUserId) {
      setLoading(false);
      setDetails(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setDetails(null);
    setError(null);

    void getAdminUserDetails(userId, { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setDetails(response.data);
      })
      .catch((requestFailure: unknown) => {
        if (!controller.signal.aborted && !isAbortError(requestFailure)) {
          setError(toDetailError(requestFailure));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [isSuperAdmin, retryCount, userId, validUserId]);

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto w-full max-w-[1180px]">
        <DetailState
          title="Super administrator access required"
          message="Account details are available to super administrators only."
          icon={<ShieldAlert size={20} aria-hidden="true" />}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
      <Link
        href="/admin/users"
        className="inline-flex w-fit items-center gap-1.5 rounded-md text-[13px] font-medium text-muted transition-colors hover:text-brand"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Accounts
      </Link>

      {!validUserId ? (
        <DetailState
          title="Invalid user ID"
          message="The link does not contain a valid account ID, so no request was made."
          icon={<CircleAlert size={20} aria-hidden="true" />}
        />
      ) : loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <DetailState
          title={
            error.kind === "not-found"
              ? "Account not found"
              : error.kind === "unauthorized"
                ? "Session expired"
                : error.kind === "forbidden"
                  ? "Access denied"
                  : error.kind === "invalid"
                    ? "Invalid user ID"
                    : "Unable to load account details"
          }
          message={error.message}
          icon={
            error.kind === "request" ? (
              <CircleAlert size={20} aria-hidden="true" />
            ) : (
              <ShieldAlert size={20} aria-hidden="true" />
            )
          }
          action={
            error.kind === "request" ? (
              <Button onClick={() => setRetryCount((count) => count + 1)}>
                <RefreshCw size={14} aria-hidden="true" />
                Try again
              </Button>
            ) : error.kind === "unauthorized" ? (
              <Link
                href={`/login?next=${encodeURIComponent(`/admin/users/${userId}`)}`}
                className="inline-flex h-9 items-center rounded-lg bg-brand px-3.5 text-sm font-medium text-white hover:bg-brand-strong"
              >
                Sign in again
              </Link>
            ) : undefined
          }
        />
      ) : details ? (
        <UserDetailsView
          details={details}
          userId={userId}
          isSuperAdmin={isSuperAdmin}
          currentAdminId={authUser?.id ?? profile?.id ?? null}
          onDetailsUpdated={setDetails}
        />
      ) : (
        <DetailState
          title="Account details unavailable"
          message="The information is not available right now. Return to the directory and try again."
          icon={<CircleAlert size={20} aria-hidden="true" />}
        />
      )}
    </div>
  );
}

type DetailTab = "account" | "dealer" | "activity";

function UserDetailsView({
  details,
  userId,
  isSuperAdmin,
  currentAdminId,
  onDetailsUpdated,
}: {
  details: AdminUserDetailsResponse["data"];
  userId: string;
  isSuperAdmin: boolean;
  currentAdminId: string | null;
  onDetailsUpdated: (details: AdminUserDetailsResponse["data"]) => void;
}) {
  const [tab, setTab] = useState<DetailTab>("account");
  const [dialogStatus, setDialogStatus] = useState<AdminAccountStatus | null>(null);
  const [statusError, setStatusError] = useState<StatusChangeError | null>(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [refreshingDetails, setRefreshingDetails] = useState(false);
  const statusSubmissionLock = useRef(false);
  const mountedRef = useRef(false);
  const refreshSequenceRef = useRef(0);
  const refreshRequestRef = useRef<{ sequence: number; controller: AbortController } | null>(null);
  const detailsRevisionRef = useRef(0);
  const statusMutationSequenceRef = useRef(0);
  const { user, dealerProfile, activitySummary } = details;
  const classification = accountClassification(user, dealerProfile);
  const isDealer = user.accountType === "dealer" || user.role === "dealer";
  const fullName = `${user.firstName} ${user.lastName}`.trim() || "Name not provided";
  const isAdminAccount = user.role === "admin" || user.adminRole !== null;
  const normalizedTargetId = normalizeAccountId(user.id);
  const normalizedCurrentAdminId = normalizeAccountId(currentAdminId);
  const canIdentifyAccounts = normalizedTargetId !== null && normalizedCurrentAdminId !== null;
  const isOwnAccount = !canIdentifyAccounts || normalizedTargetId === normalizedCurrentAdminId;
  const nextStatus: AdminAccountStatus | null =
    user.accountStatus === "active"
      ? "suspended"
      : user.accountStatus === "suspended"
        ? "active"
        : null;
  const canManageStatus =
    isSuperAdmin &&
    canIdentifyAccounts &&
    !isAdminAccount &&
    !isOwnAccount &&
    !user.deletedAt &&
    nextStatus !== null;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      statusMutationSequenceRef.current += 1;
      refreshSequenceRef.current += 1;
      const pendingRefresh = refreshRequestRef.current;
      refreshRequestRef.current = null;
      pendingRefresh?.controller.abort();
    };
  }, []);

  const commitDetails = (updatedDetails: AdminUserDetailsResponse["data"]) => {
    detailsRevisionRef.current += 1;
    onDetailsUpdated(updatedDetails);
  };

  const cancelPendingRefresh = () => {
    const pendingRefresh = refreshRequestRef.current;
    if (!pendingRefresh) return;

    refreshSequenceRef.current += 1;
    refreshRequestRef.current = null;
    pendingRefresh.controller.abort();
    if (mountedRef.current) setRefreshingDetails(false);
  };

  const closeStatusDialog = () => {
    if (statusSubmitting) return;
    setDialogStatus(null);
    setStatusError(null);
  };

  const refreshCurrentDetails = async (options: {
    showSuccessToast?: boolean;
    failureMessage?: string;
  } = {}): Promise<boolean> => {
    if (!mountedRef.current) return false;

    cancelPendingRefresh();
    const sequence = ++refreshSequenceRef.current;
    const controller = new AbortController();
    const startingDetailsRevision = detailsRevisionRef.current;
    refreshRequestRef.current = { sequence, controller };
    setDialogStatus(null);
    setStatusError(null);
    setRefreshingDetails(true);
    try {
      const refreshed = await getAdminUserDetails(userId, { signal: controller.signal });
      if (
        !mountedRef.current ||
        controller.signal.aborted ||
        refreshRequestRef.current?.sequence !== sequence ||
        refreshSequenceRef.current !== sequence ||
        detailsRevisionRef.current !== startingDetailsRevision
      ) {
        return false;
      }

      commitDetails(refreshed.data);
      if (options.showSuccessToast !== false) toast.success("Account details refreshed.");
      return true;
    } catch (requestError) {
      if (
        !mountedRef.current ||
        controller.signal.aborted ||
        refreshRequestRef.current?.sequence !== sequence ||
        refreshSequenceRef.current !== sequence ||
        isAbortError(requestError)
      ) {
        return false;
      }

      toast.error(options.failureMessage ?? "Account details could not be refreshed. Try again.");
      return false;
    } finally {
      if (refreshRequestRef.current?.sequence === sequence) {
        refreshRequestRef.current = null;
        if (mountedRef.current) setRefreshingDetails(false);
      }
    }
  };

  const confirmStatusChange = async (reason: string) => {
    if (!mountedRef.current || !canManageStatus || !dialogStatus || statusSubmissionLock.current) return;
    cancelPendingRefresh();
    statusSubmissionLock.current = true;
    const mutationSequence = ++statusMutationSequenceRef.current;
    const requestedStatus = dialogStatus;
    setStatusSubmitting(true);
    setStatusError(null);
    try {
      await updateAdminUserStatus(user.id, requestedStatus, reason);
      if (!mountedRef.current || statusMutationSequenceRef.current !== mutationSequence) return;

      // Only reflect the new status once the mutation response confirms it.
      commitDetails({
        ...details,
        user: { ...user, accountStatus: requestedStatus },
      });
      setDialogStatus(null);
      toast.success(
        requestedStatus === "suspended"
          ? "Account suspended successfully."
          : "Account reactivated successfully.",
      );
      window.dispatchEvent(new Event(ADMIN_USERS_INVALIDATED_EVENT));

      await refreshCurrentDetails({
        showSuccessToast: false,
        failureMessage: "The status changed, but the latest account details could not be refreshed.",
      });
    } catch (requestError) {
      if (
        !mountedRef.current ||
        statusMutationSequenceRef.current !== mutationSequence ||
        isAbortError(requestError)
      ) {
        return;
      }
      const friendlyError = toStatusChangeError(requestError);
      setStatusError(friendlyError);
      toast.error(friendlyError.message);
    } finally {
      statusSubmissionLock.current = false;
      if (mountedRef.current && statusMutationSequenceRef.current === mutationSequence) {
        setStatusSubmitting(false);
      }
    }
  };

  const statusTone = (status: string): DialogPillTone => {
    if (status === "active") return "success";
    if (status === "suspended") return "danger";
    if (status === "pending") return "warning";
    return "neutral";
  };

  return (
    <>
      <Panel className="px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[17px] font-semibold text-brand">
              {initials(fullName)}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-[22px] font-semibold tracking-[-0.02em] text-ink">
                  {fullName}
                </h1>
                <AdminStatusBadge status={classification.badgeStatus} label={classification.label} />
                <AdminStatusBadge status={user.accountStatus} />
              </div>
              <div className="mt-1.5 flex flex-col gap-1 text-[13px] text-muted sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <Mail size={13} aria-hidden="true" className="shrink-0 text-subtle" />
                  <span className="break-all">{displayValue(user.email)}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Phone size={13} aria-hidden="true" className="shrink-0 text-subtle" />
                  {displayValue(user.phoneNumber)}
                </span>
              </div>
            </div>
          </div>

          <dl className="flex shrink-0 flex-col gap-1.5 text-xs xl:min-w-[400px]">
            <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-3">
              <dt className="text-subtle">Account ID</dt>
              <dd className="break-all font-mono text-[11.5px] text-ink">{user.id}</dd>
            </div>
            <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-3">
              <dt className="text-subtle">Registered</dt>
              <dd className="text-ink">{formatDate(user.createdAt)}</dd>
            </div>
            <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-3">
              <dt className="text-subtle">Last login</dt>
              <dd className="text-ink">{formatDate(user.lastLoginAt)}</dd>
            </div>
          </dl>
        </div>
      </Panel>

      <Tabs
        label="Account sections"
        items={[
          { label: "Account", active: tab === "account", onSelect: () => setTab("account") },
          { label: "Dealer profile", active: tab === "dealer", onSelect: () => setTab("dealer") },
          {
            label: "Marketplace activity",
            active: tab === "activity",
            onSelect: () => setTab("activity"),
          },
        ]}
      />

      {refreshingDetails ? (
        <p role="status" className="flex items-center gap-1.5 text-xs text-subtle">
          <Loader2 size={12} className="animate-spin" aria-hidden="true" />
          Refreshing account details
        </p>
      ) : null}

      {tab === "account" ? (
        <Panel>
          <PanelHeader title="Account" />
          <div className="grid gap-x-10 gap-y-2 px-4 py-3 md:grid-cols-2">
            <FieldGroup title="Identity">
              <FieldRow label="First name" value={displayValue(user.firstName)} />
              <FieldRow label="Last name" value={displayValue(user.lastName)} />
              <FieldRow label="Email" value={displayValue(user.email)} wrap />
              <FieldRow label="Phone number" value={displayValue(user.phoneNumber)} />
              <FieldRow
                label="Email verified"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    {user.emailVerified ? (
                      <CheckCircle2 size={13} className="text-emerald-700" aria-hidden="true" />
                    ) : (
                      <CircleAlert size={13} className="text-amber-700" aria-hidden="true" />
                    )}
                    {user.emailVerified ? "Verified" : "Not verified"}
                  </span>
                }
              />
              <FieldRow label="Verified at" value={formatDate(user.emailVerifiedAt)} />
            </FieldGroup>

            <FieldGroup title="Access">
              <FieldRow label="Role" value={accountRoleLabel(user.role)} />
              <FieldRow label="Account type" value={accountTypeLabel(user, classification.label)} />
              <FieldRow label="Administrator level" value={adminRoleLabel(user.adminRole)} />
              <FieldRow label="Account created" value={formatDate(user.createdAt)} />
              <FieldRow label="Last login" value={formatDate(user.lastLoginAt)} />
              <FieldRow label="Deleted" value={user.deletedAt ? formatDate(user.deletedAt) : "Not deleted"} />
            </FieldGroup>
          </div>

          {canManageStatus && nextStatus ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">Account access</p>
                <p className="mt-0.5 text-xs text-subtle">
                  {nextStatus === "suspended"
                    ? "Suspension requires a written reason and blocks sign-in."
                    : "Reactivation restores sign-in for this account and requires a written reason."}
                </p>
              </div>
              <Button
                variant={nextStatus === "suspended" ? "dangerOutline" : "primary"}
                onClick={() => {
                  setStatusError(null);
                  setDialogStatus(nextStatus);
                }}
                disabled={refreshingDetails || statusSubmitting}
              >
                {nextStatus === "suspended" ? (
                  <Ban size={14} aria-hidden="true" />
                ) : (
                  <CheckCircle2 size={14} aria-hidden="true" />
                )}
                {nextStatus === "suspended" ? "Suspend account" : "Reactivate account"}
              </Button>
            </div>
          ) : (
            <div className="mt-3 border-t border-hairline px-4 py-3">
              <p className="text-xs text-subtle">
                {isAdminAccount
                  ? "Administrator accounts cannot be suspended from this screen."
                  : isOwnAccount
                    ? "You cannot change the status of your own account."
                    : user.deletedAt
                      ? "Deleted accounts cannot change status."
                      : "This account status cannot be changed."}
              </p>
            </div>
          )}
        </Panel>
      ) : null}

      {tab === "dealer" ? (
        dealerProfile ? (
          <DealerProfilePanel profile={dealerProfile} />
        ) : (
          <Panel>
            <EmptyState
              icon={Building2}
              title={isDealer ? "Dealer profile not available" : "No dealer profile"}
              message={
                isDealer
                  ? "This account is marked as a dealer, but the backend did not return a dealer profile."
                  : "This account is not registered as a dealership."
              }
            />
          </Panel>
        )
      ) : null}

      {tab === "activity" ? <ActivityPanel details={activitySummary} /> : null}

      {canManageStatus && dialogStatus ? (
        <ConfirmDialog
          title={dialogStatus === "suspended" ? "Suspend account" : "Reactivate account"}
          description="The change is stored on the account with your reason."
          tone={dialogStatus === "suspended" ? "danger" : "primary"}
          confirmLabel={
            dialogStatus === "suspended" ? "Confirm suspension" : "Confirm reactivation"
          }
          submitting={statusSubmitting}
          submitError={
            statusError
              ? {
                  message: statusError.message,
                  canRefresh: statusError.kind === "conflict" || statusError.kind === "not-found",
                }
              : null
          }
          onCancel={closeStatusDialog}
          onConfirm={(reason) => void confirmStatusChange(reason)}
          onRefresh={() => void refreshCurrentDetails()}
          reason={{
            label: `Reason for ${dialogStatus === "suspended" ? "suspension" : "reactivation"}`,
            help: "The reason is sent to the backend with this request.",
            placeholder: "Provide a clear reason for this status change",
          }}
        >
          <DialogTarget
            name={fullName}
            email={user.email}
            id={user.id}
            initialsText={initials(fullName)}
          />
          <div className="mt-3">
            <DialogTransition
              from={{
                label: "Current status",
                text: humanize(user.accountStatus),
                tone: statusTone(user.accountStatus),
              }}
              to={{
                label: "After confirmation",
                text: humanize(dialogStatus),
                tone: statusTone(dialogStatus),
              }}
            />
          </div>
          <p className="mt-3 text-xs leading-5 text-muted">
            {dialogStatus === "suspended"
              ? "Suspending blocks sign-in for this account. The reason is stored on the account record."
              : "Reactivation restores sign-in for this account. The reason is stored on the account record."}
          </p>
        </ConfirmDialog>
      ) : null}
    </>
  );
}
