"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/apiClient";
import {
  getAdminUserDetails,
  updateAdminUserStatus,
} from "@/lib/clientFirebaseServices";
import type {
  AdminAccountStatus,
  AdminDealerProfileDetails,
  AdminUserDetailsAccount,
  AdminUserDetailsResponse,
} from "@/Types/user";
import { ADMIN_USERS_INVALIDATED_EVENT } from "@/Types/user";
import {
  ArrowLeft,
  Building2,
  Car,
  CheckCircle2,
  CircleAlert,
  History,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  ShieldAlert,
  X,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
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

type DetailError = {
  kind: DetailErrorKind;
  message: string;
};

type StatusChangeErrorKind = "invalid" | "unauthorized" | "forbidden" | "not-found" | "conflict" | "request";

type StatusChangeError = {
  kind: StatusChangeErrorKind;
  message: string;
};

function toDetailError(error: unknown): DetailError {
  if (error instanceof ApiError) {
    if (error.statusCode === 400) {
      return { kind: "invalid", message: "This user ID is not valid." };
    }
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
        return { kind: "unauthorized", message: "Your session expired or is missing. Sign in again before making this change." };
      case 403:
        return { kind: "forbidden", message: "Your account does not have permission to change this account status." };
      case 404:
        return { kind: "not-found", message: "This account no longer exists. Refresh its details before continuing." };
      case 409:
        return { kind: "conflict", message: "This account may have changed since you opened it. Refresh its details before trying again." };
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
    const isSuperAdmin = user.adminRole === "super_admin";
    return {
      badgeStatus: "admin",
      label: isSuperAdmin ? "Super administrator" : "Administrator",
    };
  }

  if (user.accountType === "dealer" || user.role === "dealer") {
    const verificationStatus = dealerProfile?.verificationStatus;
    if (verificationStatus === "verified") {
      return { badgeStatus: "approved", label: "Approved dealer" };
    }
    if (verificationStatus === "rejected") {
      return { badgeStatus: "rejected", label: "Dealer application rejected" };
    }
    if (verificationStatus === "suspended") {
      return { badgeStatus: "suspended", label: "Dealer suspended" };
    }
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
  return user.accountType === "seller" ? "Individual seller" : user.accountType[0].toUpperCase() + user.accountType.slice(1);
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

function InfoField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#F8FAF9] p-4">
      <dt className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-[#0B5D3B]">
          {icon}
        </span>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function CountCard({ title, value, detail }: { title: string; value: number; detail: string }) {
  return (
    <div className="rounded-2xl border border-[#E8ECEA] bg-[#FBFCFB] p-4">
      <p className="text-sm font-semibold text-gray-600">{title}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-[#0B5D3B]">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{detail}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading user details" aria-live="polite">
      <div className="h-56 animate-pulse rounded-3xl bg-white shadow-sm" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-3xl bg-white shadow-sm" />
        <div className="h-72 animate-pulse rounded-3xl bg-white shadow-sm" />
      </div>
      <div className="h-56 animate-pulse rounded-3xl bg-white shadow-sm" />
      <span className="sr-only">Loading user details…</span>
    </div>
  );
}

function BackToUsers() {
  return (
    <Link
      href="/admin/users"
      className="mb-5 inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-[#0B5D3B] hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5D3B]"
    >
      <ArrowLeft size={17} aria-hidden="true" />
      Back to Users
    </Link>
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
    <div className="rounded-3xl border border-[#E5E7EB] bg-white px-6 py-12 text-center shadow-sm">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
        {icon}
      </span>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600">{message}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

function DealerProfileSection({ profile }: { profile: AdminDealerProfileDetails }) {
  return (
    <Panel title="Dealer profile" icon={<Building2 size={20} aria-hidden="true" />}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InfoField label="Dealership name" value={profile.businessName} />
        <InfoField label="Registration number" value={displayValue(profile.businessRegistrationNumber)} />
        <InfoField label="Business email" value={displayValue(profile.contactEmail)} />
        <InfoField label="Business phone" value={displayValue(profile.contactPhone)} />
        <InfoField label="Address" value={displayValue(profile.address)} />
        <InfoField
          label="Verification status"
          value={<AdminStatusBadge status={profile.verificationStatus} />}
        />
        <InfoField label="Profile created" value={formatDate(profile.createdAt)} />
        <InfoField label="Last updated" value={formatDate(profile.updatedAt)} />
        {profile.verificationReason && (
          <InfoField label="Latest verification reason" value={profile.verificationReason} />
        )}
      </div>

      <div className="mt-7 border-t border-[#E8ECEA] pt-5">
        <div className="mb-4 flex items-center gap-2">
          <History size={18} className="text-[#0B5D3B]" aria-hidden="true" />
          <h3 className="font-bold text-slate-900">Dealer decision history</h3>
        </div>
        {profile.verificationHistory.length === 0 ? (
          <div className="rounded-2xl bg-[#F8FAF9] p-5 text-sm text-gray-600">
            No dealer approval or rejection history is available.
          </div>
        ) : (
          <ol className="space-y-3">
            {profile.verificationHistory.map((decision, index) => {
              const approved = decision.action === "dealer.approve";
              return (
                <li
                  key={`${decision.action}-${decision.timestamp}-${index}`}
                  className="rounded-2xl border border-[#E8ECEA] p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-2">
                      <AdminStatusBadge
                        status={approved ? "approved" : "rejected"}
                        label={approved ? "Approved" : "Rejected"}
                      />
                      <span className="text-sm font-semibold text-slate-900">Dealer application</span>
                    </div>
                    <time className="text-xs text-gray-500" dateTime={decision.timestamp}>
                      {formatDate(decision.timestamp)}
                    </time>
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    Actor ID: {decision.actorId ?? "Not recorded"}
                  </p>
                  {decision.reason && (
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                      {decision.reason}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Panel>
  );
}

function ActivitySummary({ details }: { details: AdminUserDetailsResponse["data"]["activitySummary"] }) {
  return (
    <Panel title="Marketplace activity" icon={<Car size={20} aria-hidden="true" />}>
      <div className="space-y-6">
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Vehicles</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <CountCard title="Total listings" value={details.vehicles.total} detail="All listing records" />
            <CountCard title="Active listings" value={details.vehicles.active} detail="Published and available" />
            <CountCard title="Sold listings" value={details.vehicles.sold} detail="Marked as sold" />
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Bookings</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <CountCard title="As buyer" value={details.bookings.asBuyer} detail="Buyer booking records" />
            <CountCard title="As seller" value={details.bookings.asSeller} detail="Seller booking records" />
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Offers</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <CountCard title="As buyer" value={details.offers.asBuyer} detail="Buyer offer records" />
            <CountCard title="As seller" value={details.offers.asSeller} detail="Seller offer records" />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function AccountStatusDialog({
  account,
  targetStatus,
  submitting,
  error,
  onCancel,
  onConfirm,
  onRefresh,
}: {
  account: AdminUserDetailsAccount;
  targetStatus: AdminAccountStatus;
  submitting: boolean;
  error: StatusChangeError | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  onRefresh: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const isSuspending = targetStatus === "suspended";
  const fullName = `${account.firstName} ${account.lastName}`.trim() || "Name not provided";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    reasonRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      setValidationError("Enter a reason before confirming.");
      reasonRef.current?.focus();
      return;
    }
    if (normalizedReason.length > 1000) {
      setValidationError("The reason must be 1,000 characters or fewer.");
      reasonRef.current?.focus();
      return;
    }
    setValidationError(null);
    onConfirm(normalizedReason);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby="account-status-dialog-title"
      aria-describedby="account-status-dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!submitting) onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !submitting) onCancel();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-3xl p-0 shadow-2xl backdrop:bg-slate-950/55"
    >
      <div className="p-5 sm:p-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#C9A227]">Account management</p>
            <h2 id="account-status-dialog-title" className="mt-1 text-2xl font-bold text-slate-900">
              {isSuspending ? "Suspend account" : "Reactivate account"}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close confirmation dialog"
            disabled={submitting}
            onClick={onCancel}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0B5D3B] disabled:opacity-50"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <p id="account-status-dialog-description" className="mt-3 text-sm leading-6 text-gray-600">
          {isSuspending
            ? "This will mark the account as suspended and restrict the user’s access to Easy Ride until the account is reactivated."
            : "This will mark the account as active and restore the user’s access to Easy Ride, subject to normal account checks."}
        </p>

        <div className="mt-4 rounded-2xl border border-[#E8ECEA] bg-[#F8FAF9] p-4">
          <p className="font-semibold text-slate-900">{fullName}</p>
          <p className="mt-1 break-all text-sm text-gray-600">{displayValue(account.email)}</p>
          <p className="mt-2 break-all font-mono text-xs text-gray-500">{account.id}</p>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="account-status-reason" className="mb-2 block text-sm font-semibold text-slate-900">
              Reason for {isSuspending ? "suspension" : "reactivation"}
            </label>
            <textarea
              ref={reasonRef}
              id="account-status-reason"
              name="reason"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                if (validationError) setValidationError(null);
              }}
              required
              maxLength={1000}
              rows={4}
              disabled={submitting}
              aria-invalid={Boolean(validationError)}
              aria-describedby={`account-status-reason-help${validationError ? " account-status-reason-error" : ""}`}
              className="w-full resize-y rounded-2xl border border-[#D7DEDA] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#0B5D3B] focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50"
              placeholder="Provide a clear reason for this status change"
            />
            <div className="mt-1 flex items-start justify-between gap-3 text-xs">
              <p id="account-status-reason-help" className="text-gray-500">The reason is sent to the backend with this request.</p>
              <span className="shrink-0 text-gray-500">{reason.length}/1,000</span>
            </div>
            {validationError && (
              <p id="account-status-reason-error" className="mt-2 text-sm text-red-700" role="alert">
                {validationError}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
              <p>{error.message}</p>
              {(error.kind === "conflict" || error.kind === "not-found") && (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={submitting}
                  className="mt-2 inline-flex items-center gap-2 font-bold underline underline-offset-2 disabled:opacity-50"
                >
                  <RefreshCw size={14} aria-hidden="true" />
                  Refresh account details
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="rounded-full border border-[#D1D5DB] px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5D3B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason.trim() || reason.trim().length > 1000}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isSuspending ? "bg-red-700 hover:bg-red-800 focus-visible:outline-red-700" : "bg-[#0B5D3B] hover:bg-[#084b30] focus-visible:outline-[#0B5D3B]"}`}
            >
              {submitting && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {submitting ? "Saving…" : isSuspending ? "Confirm suspension" : "Confirm reactivation"}
            </button>
          </div>
        </form>
      </div>
    </dialog>
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
      <section className="min-h-[60vh] px-4 py-8 sm:px-6 lg:px-8">
        <DetailState
          title="Super administrator access required"
          message="User details are available to super administrators only."
          icon={<ShieldAlert size={28} aria-hidden="true" />}
        />
      </section>
    );
  }

  return (
    <section className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <BackToUsers />

        {!validUserId ? (
          <DetailState
            title="Invalid user ID"
            message="The user link does not contain a valid ID, so no API request was made."
            icon={<CircleAlert size={28} aria-hidden="true" />}
          />
        ) : loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <DetailState
            title={
              error.kind === "not-found" ? "User not found" :
                error.kind === "unauthorized" ? "Session expired" :
                  error.kind === "forbidden" ? "Access denied" :
                    error.kind === "invalid" ? "Invalid user ID" : "Unable to load user details"
            }
            message={error.message}
            icon={error.kind === "request" ? <CircleAlert size={28} aria-hidden="true" /> : <ShieldAlert size={28} aria-hidden="true" />}
            action={
              error.kind === "request" ? (
                <button
                  type="button"
                  onClick={() => setRetryCount((count) => count + 1)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0B5D3B] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#084b30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5D3B]"
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  Try again
                </button>
              ) : error.kind === "unauthorized" ? (
                <Link
                  href={`/login?next=${encodeURIComponent(`/admin/users/${userId}`)}`}
                  className="rounded-full bg-[#0B5D3B] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#084b30] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5D3B]"
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
            title="User details unavailable"
            message="The user information is not available right now. Return to the directory and try again."
            icon={<CircleAlert size={28} aria-hidden="true" />}
          />
        )}
      </div>
    </section>
  );
}

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
  const nextStatus: AdminAccountStatus | null = user.accountStatus === "active"
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

      // The mutation response confirms the requested status before the UI changes.
      commitDetails({
        ...details,
        user: { ...user, accountStatus: requestedStatus },
      });
      setDialogStatus(null);
      toast.success(requestedStatus === "suspended" ? "Account suspended successfully." : "Account reactivated successfully.");
      window.dispatchEvent(new Event(ADMIN_USERS_INVALIDATED_EVENT));

      await refreshCurrentDetails({
        showSuccessToast: false,
        failureMessage: "The status changed, but the latest account details could not be refreshed.",
      });
    } catch (requestError) {
      if (!mountedRef.current || statusMutationSequenceRef.current !== mutationSequence || isAbortError(requestError)) return;
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

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#0B5D3B]">
              <UserRound size={27} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#C9A227]">User profile</p>
              <h1 className="mt-1 break-words text-3xl font-bold text-slate-900 sm:text-4xl">{fullName}</h1>
              <div className="mt-3 flex flex-col gap-2 text-sm text-gray-600 sm:flex-row sm:flex-wrap sm:gap-x-5">
                <span className="inline-flex min-w-0 items-center gap-2 break-all">
                  <Mail size={16} className="shrink-0 text-[#0B5D3B]" aria-hidden="true" />
                  {displayValue(user.email)}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Phone size={16} className="shrink-0 text-[#0B5D3B]" aria-hidden="true" />
                  {displayValue(user.phoneNumber)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 xl:max-w-md xl:justify-end">
            <AdminStatusBadge status={classification.badgeStatus} label={classification.label} />
            <AdminStatusBadge status={user.accountStatus} />
          </div>
        </div>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoField label="User ID" value={<span className="break-all font-mono text-xs">{user.id}</span>} />
          <InfoField label="Role" value={accountRoleLabel(user.role)} />
          <InfoField label="Account type" value={accountTypeLabel(user, classification.label)} />
          <InfoField label="Registered" value={formatDate(user.createdAt)} />
        </dl>
      </section>

      {canManageStatus && nextStatus && (
        <section className="flex flex-col gap-4 rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="font-bold text-slate-900">Account actions</h2>
            <p className="mt-1 text-sm text-gray-600">
              {refreshingDetails ? "Refreshing account details…" : "Change access for this marketplace account."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setStatusError(null);
              setDialogStatus(nextStatus);
            }}
            disabled={refreshingDetails || statusSubmitting}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${nextStatus === "suspended" ? "bg-red-700 hover:bg-red-800 focus-visible:outline-red-700" : "bg-[#0B5D3B] hover:bg-[#084b30] focus-visible:outline-[#0B5D3B]"}`}
          >
            {nextStatus === "suspended"
              ? <><ShieldAlert size={17} aria-hidden="true" /> Suspend Account</>
              : <><CheckCircle2 size={17} aria-hidden="true" /> Reactivate Account</>}
          </button>
        </section>
      )}

      <Panel title="Account information" icon={<Users size={20} aria-hidden="true" />}>
        <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <InfoField label="First name" value={displayValue(user.firstName)} />
          <InfoField label="Last name" value={displayValue(user.lastName)} />
          <InfoField label="Email" value={displayValue(user.email)} />
          <InfoField label="Phone number" value={displayValue(user.phoneNumber)} />
          <InfoField
            label="Email verification"
            value={
              <span className="inline-flex items-center gap-2">
                {user.emailVerified
                  ? <CheckCircle2 size={16} className="text-emerald-700" aria-hidden="true" />
                  : <CircleAlert size={16} className="text-amber-700" aria-hidden="true" />}
                {user.emailVerified ? "Verified" : "Not verified"}
              </span>
            }
          />
          <InfoField label="Email verified at" value={formatDate(user.emailVerifiedAt)} />
          <InfoField label="Account status" value={<AdminStatusBadge status={user.accountStatus} />} />
          <InfoField label="Account created" value={formatDate(user.createdAt)} />
          <InfoField label="Last login" value={formatDate(user.lastLoginAt)} />
          {user.adminRole && <InfoField label="Administrator level" value={adminRoleLabel(user.adminRole)} />}
          {user.deletedAt && <InfoField label="Deleted at" value={formatDate(user.deletedAt)} />}
        </dl>
      </Panel>

      {dealerProfile ? (
        <DealerProfileSection profile={dealerProfile} />
      ) : isDealer ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950" role="status">
          <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Dealer profile not available</p>
            <p className="mt-1 text-sm leading-6">This account is marked as a dealer, but the backend did not return a dealer profile.</p>
          </div>
        </div>
      ) : null}

      <ActivitySummary details={activitySummary} />

      {canManageStatus && dialogStatus && (
        <AccountStatusDialog
          account={user}
          targetStatus={dialogStatus}
          submitting={statusSubmitting}
          error={statusError}
          onCancel={closeStatusDialog}
          onConfirm={confirmStatusChange}
          onRefresh={() => void refreshCurrentDetails()}
        />
      )}
    </div>
  );
}
