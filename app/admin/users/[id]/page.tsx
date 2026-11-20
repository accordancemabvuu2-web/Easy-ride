"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/apiClient";
import { getAdminUserDetails } from "@/lib/clientFirebaseServices";
import type {
  AdminDealerProfileDetails,
  AdminUserDetailsAccount,
  AdminUserDetailsResponse,
} from "@/Types/user";
import {
  ArrowLeft,
  Building2,
  Car,
  CheckCircle2,
  CircleAlert,
  History,
  Mail,
  Phone,
  RefreshCw,
  ShieldAlert,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

type DetailErrorKind = "invalid" | "not-found" | "unauthorized" | "forbidden" | "request";

type DetailError = {
  kind: DetailErrorKind;
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

export default function AdminUserDetailsPage() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const validUserId = typeof userId === "string" && OBJECT_ID_PATTERN.test(userId);
  const { isSuperAdmin } = useAuth();
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
        if (!controller.signal.aborted) setError(toDetailError(requestFailure));
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
          <UserDetailsView details={details} />
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

function UserDetailsView({ details }: { details: AdminUserDetailsResponse["data"] }) {
  const { user, dealerProfile, activitySummary } = details;
  const classification = accountClassification(user, dealerProfile);
  const isDealer = user.accountType === "dealer" || user.role === "dealer";
  const fullName = `${user.firstName} ${user.lastName}`.trim() || "Name not provided";

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
    </div>
  );
}
