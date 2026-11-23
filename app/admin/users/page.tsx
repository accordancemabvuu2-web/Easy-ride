"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import Button from "@/Components/admin/Button";
import EmptyState from "@/Components/admin/EmptyState";
import { SearchField, SelectField } from "@/Components/admin/Filters";
import PageHeader from "@/Components/admin/PageHeader";
import Pagination from "@/Components/admin/Pagination";
import Panel, { PanelHeader } from "@/Components/admin/Panel";
import Tabs from "@/Components/admin/Tabs";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/apiClient";
import { getAdminUsers, getAuditLogs } from "@/lib/clientFirebaseServices";
import { cx } from "@/lib/classNames";
import { formatAuditStamp, humanize, initials } from "@/lib/format";
import type { AuditLog } from "@/Types/audit";
import {
  ADMIN_USERS_INVALIDATED_EVENT,
  type AdminUserRecord,
  type AdminUserStatusFilter,
  type AdminUsersQuery,
  type AdminUsersResponse,
} from "@/Types/user";
import {
  Ban,
  Check,
  ChevronRight,
  Flag,
  Headphones,
  History,
  Lock,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

type AccountCategory =
  | "all"
  | "buyer"
  | "seller"
  | "pending-dealer"
  | "approved-dealer"
  | "administrator"
  | "super-administrator";

type RequestError = {
  kind: "unauthorized" | "forbidden" | "request";
  message: string;
};

const PAGE_SIZE = 24;

function accountCategoryQuery(
  category: AccountCategory,
): Pick<AdminUsersQuery, "accountType" | "role"> {
  switch (category) {
    case "buyer":
      return { accountType: "buyer" };
    case "seller":
      return { accountType: "seller" };
    case "pending-dealer":
      return { accountType: "dealer", role: "user" };
    case "approved-dealer":
      return { accountType: "dealer", role: "dealer" };
    case "administrator":
      return { accountType: "admin", role: "admin" };
    case "super-administrator":
      return { accountType: "super_admin", role: "admin" };
    default:
      return {};
  }
}

function accountPresentation(user: AdminUserRecord): { status: string; label: string } {
  if (user.role === "admin" || user.adminRole) {
    return {
      status: "admin",
      label: user.adminRole === "super_admin" ? "Super administrator" : "Administrator",
    };
  }

  if (user.accountType === "dealer") {
    switch (user.dealerVerificationStatus) {
      case "verified":
        return { status: "approved", label: "Approved dealer" };
      case "pending":
      case "under_review":
        return { status: user.dealerVerificationStatus, label: "Pending dealer" };
      case "rejected":
        return { status: "rejected", label: "Dealer application rejected" };
      case "suspended":
        return { status: "suspended", label: "Dealer suspended" };
      default:
        return user.role === "dealer"
          ? { status: "approved", label: "Approved dealer" }
          : { status: "dealer", label: "Dealer account" };
    }
  }

  if (user.accountType === "seller") return { status: "seller", label: "Individual seller" };
  if (user.accountType === "buyer") return { status: "buyer", label: "Buyer" };
  return { status: user.role, label: "Account type unavailable" };
}

function accountTypeDetail(user: AdminUserRecord): string | null {
  if (user.role === "admin" || user.adminRole) {
    return user.adminRole ? humanize(user.adminRole) : null;
  }
  if (user.accountType !== "dealer") return null;
  if (user.dealerVerificationStatus === "verified") return "Verification verified";
  if (user.dealerVerificationStatus === "pending") return "Verification pending";
  if (user.dealerVerificationStatus === "under_review") return "Verification under review";
  if (user.dealerVerificationStatus === "rejected") return "Verification rejected";
  if (user.dealerVerificationStatus === "suspended") return "Verification suspended";
  return null;
}

function compactId(id: string): string {
  return id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id;
}

function requestError(error: unknown): RequestError {
  if (error instanceof ApiError && error.statusCode === 401) {
    return {
      kind: "unauthorized",
      message: "Your session could not be verified. Sign in again to continue.",
    };
  }
  if (error instanceof ApiError && error.statusCode === 403) {
    return {
      kind: "forbidden",
      message: "Super administrator access is required to view marketplace users.",
    };
  }
  return {
    kind: "request",
    message:
      error instanceof Error
        ? error.message
        : "The users could not be loaded. Please try again.",
  };
}

const TH = "h-10 px-4 text-left text-xs font-medium text-subtle";
const TD = "h-12 border-b border-hairline-soft px-4 align-middle text-sm text-ink";

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-[1180px]">
          <div className="h-6 w-32 animate-pulse rounded bg-[#e9eeeb]" />
          <div className="mt-4 h-64 animate-pulse rounded-xl bg-surface" />
        </div>
      }
    >
      <UsersPageContent />
    </Suspense>
  );
}

function UsersPageContent() {
  const { isSuperAdmin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") === "oversight" ? "oversight" : "directory";

  const selectView = (next: "directory" | "oversight") => {
    router.replace(next === "oversight" ? "/admin/users?view=oversight" : "/admin/users", {
      scroll: false,
    });
  };

  if (!isSuperAdmin) {
    return (
      <div className="mx-auto w-full max-w-[1180px]">
        <Panel className="border-amber-200 px-6 py-12 text-center">
          <ShieldAlert size={32} aria-hidden="true" className="mx-auto text-amber-700" />
          <h1 className="mt-4 text-xl font-semibold text-ink">Super administrator access required</h1>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">
            Account management is available to super administrators only. The backend rejects
            requests from other roles.
          </p>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
      <PageHeader
        title="Users"
        meta={view === "directory" ? undefined : "Administrator accounts"}
      />

      <Tabs
        label="User administration views"
        items={[
          { label: "Directory", active: view === "directory", onSelect: () => selectView("directory") },
          {
            label: "Oversight",
            icon: Shield,
            active: view === "oversight",
            onSelect: () => selectView("oversight"),
          },
        ]}
      />

      {view === "directory" ? <DirectoryView /> : <OversightView />}
    </div>
  );
}

function DirectoryView() {
  const [result, setResult] = useState<AdminUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<RequestError | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [accountCategory, setAccountCategory] = useState<AccountCategory>("all");
  const [status, setStatus] = useState<AdminUserStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [retryCount, setRetryCount] = useState(0);
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const reloadUsers = () => setRetryCount((count) => count + 1);
    window.addEventListener(ADMIN_USERS_INVALIDATED_EVENT, reloadUsers);
    return () => window.removeEventListener(ADMIN_USERS_INVALIDATED_EVENT, reloadUsers);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const query: AdminUsersQuery = {
      ...accountCategoryQuery(accountCategory),
      page,
      pageSize: PAGE_SIZE,
      search,
      status,
    };

    setLoading(!hasRequestedRef.current);
    setRefreshing(hasRequestedRef.current);
    setError(null);

    void getAdminUsers(query, { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        setResult(response);
      })
      .catch((requestFailure: unknown) => {
        if (controller.signal.aborted) return;
        setResult(null);
        setError(requestError(requestFailure));
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        hasRequestedRef.current = true;
        setLoading(false);
        setRefreshing(false);
      });

    return () => controller.abort();
  }, [accountCategory, page, retryCount, search, status]);

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setAccountCategory("all");
    setStatus("all");
    setPage(1);
  };

  const filtersActive =
    searchInput.trim().length > 0 || accountCategory !== "all" || status !== "all";

  const totalPages = result?.meta.totalPages ?? 0;
  const currentPage = result?.meta.page ?? page;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="sr-only">Account directory</h2>
        {refreshing ? (
          <span role="status" className="inline-flex items-center gap-1.5 text-xs text-subtle">
            <RefreshCw size={12} className="animate-spin" aria-hidden="true" />
            Updating results
          </span>
        ) : null}
      </div>

      <Panel className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <SearchField
          id="admin-user-search"
          label="Search"
          value={searchInput}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchInput(event.target.value)}
          placeholder="Name, email, phone or account ID"
          maxLength={100}
          disabled={loading}
        />
        <SelectField
          id="admin-user-category"
          label="Account type"
          value={accountCategory}
          onChange={(event) => {
            setAccountCategory(event.target.value as AccountCategory);
            setPage(1);
          }}
        >
          <option value="all">All types</option>
          <option value="buyer">Buyer</option>
          <option value="seller">Individual seller</option>
          <option value="pending-dealer">Pending dealer</option>
          <option value="approved-dealer">Approved dealer</option>
          <option value="administrator">Administrator</option>
          <option value="super-administrator">Super administrator</option>
        </SelectField>
        <SelectField
          id="admin-user-status"
          label="Account status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as AdminUserStatusFilter);
            setPage(1);
          }}
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="deleted">Deleted</option>
        </SelectField>
        <div className="flex shrink-0 items-center gap-1 pb-0.5 sm:pb-0">
          <span className="whitespace-nowrap px-1 text-xs text-subtle tabular-nums">
            {result ? `${result.meta.total.toLocaleString()} results` : "— results"}
          </span>
          <Button variant="quiet" size="sm" onClick={clearFilters} disabled={!filtersActive}>
            Clear filters
          </Button>
        </div>
      </Panel>

      {searchInput.trim() !== search ? (
        <p role="status" className="text-xs text-subtle">
          Waiting to search…
        </p>
      ) : null}

      {error ? (
        <Panel className="border-amber-200 bg-amber-50 px-4 py-3" aria-label="Load error">
          <p className="text-sm font-semibold text-amber-900">
            {error.kind === "forbidden"
              ? "Access denied"
              : error.kind === "unauthorized"
                ? "Session expired"
                : "Unable to load users"}
          </p>
          <p className="mt-0.5 text-xs text-amber-900/80">{error.message}</p>
          {error.kind === "request" ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-2.5"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              <RefreshCw size={13} aria-hidden="true" />
              Try again
            </Button>
          ) : null}
        </Panel>
      ) : null}

      {loading ? (
        <Panel className="overflow-hidden" aria-busy="true" aria-label="Loading accounts">
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-11 animate-pulse rounded-lg bg-[#f4f7f5]" />
            ))}
          </div>
        </Panel>
      ) : !error && result ? (
        <>
          <Panel className="overflow-hidden">
            <div className="hidden md:block">
              <table className="w-full table-fixed border-collapse" aria-label="Marketplace accounts">
                <colgroup>
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "21%" }} />
                  <col />
                </colgroup>
                <thead className="bg-[#fafbfa]">
                  <tr className="border-b border-hairline">
                    <th scope="col" className={TH}>Account</th>
                    <th scope="col" className={TH}>Type</th>
                    <th scope="col" className={TH}>Access</th>
                    <th scope="col" className={TH}>User ID</th>
                    <th scope="col" className={cx(TH, "text-right")}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.map((user) => {
                    const presentation = accountPresentation(user);
                    const detail = accountTypeDetail(user);
                    const name = `${user.firstName} ${user.lastName}`.trim();
                    return (
                      <tr key={user.id} className="transition-colors hover:bg-[#f7faf8]">
                        <td className={TD}>
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand">
                              {initials(name || user.email || user.id)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-ink">
                                {name || "Name not provided"}
                              </p>
                              <p className="truncate text-xs text-subtle">
                                {user.email ?? "Email not provided"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className={TD}>
                          <p className="truncate text-sm text-ink">{presentation.label}</p>
                          {detail ? <p className="truncate text-xs text-subtle">{detail}</p> : null}
                        </td>
                        <td className={TD}>
                          <AdminStatusBadge status={user.accountStatus} />
                        </td>
                        <td className={TD}>
                          <span
                            className="block truncate font-mono text-[11.5px] text-subtle"
                            title={user.id}
                          >
                            {compactId(user.id)}
                          </span>
                        </td>
                        <td className={cx(TD, "text-right")}>
                          <Link
                            href={`/admin/users/${encodeURIComponent(user.id)}`}
                            aria-label={`View account ${name || user.id}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                          >
                            View
                            <ChevronRight size={13} aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-hairline-soft md:hidden">
              {result.data.map((user) => {
                const presentation = accountPresentation(user);
                const detail = accountTypeDetail(user);
                const name = `${user.firstName} ${user.lastName}`.trim();
                return (
                  <li key={user.id}>
                    <Link
                      href={`/admin/users/${encodeURIComponent(user.id)}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#f7faf8]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10.5px] font-semibold text-brand">
                        {initials(name || user.email || user.id)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">
                          {name || "Name not provided"}
                        </span>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-xs text-subtle">{presentation.label}</span>
                          <AdminStatusBadge status={user.accountStatus} />
                        </span>
                        {detail ? (
                          <span className="mt-0.5 block truncate text-[11px] text-subtle">{detail}</span>
                        ) : null}
                      </span>
                      <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-[#b9c6bf]" />
                    </Link>
                  </li>
                );
              })}
            </ul>

            {result.data.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No accounts match these filters"
                message="Try a different account type or clear the search."
                action={
                  filtersActive ? (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : undefined
                }
              />
            ) : null}
          </Panel>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            total={result.meta.total}
            pageSize={result.meta.pageSize || PAGE_SIZE}
            disabled={refreshing}
            onChange={setPage}
          />
        </>
      ) : null}
    </>
  );
}

const ACTION_FILTERS = [
  { value: "all", label: "All actions" },
  { value: "user", label: "Account changes" },
  { value: "listing", label: "Listing decisions" },
  { value: "verification", label: "Verification decisions" },
  { value: "report", label: "Report decisions" },
  { value: "support", label: "Support updates" },
] as const;

function actionIcon(action: string) {
  if (action === "listing_approved" || action === "listing_restored") return Check;
  if (action === "listing_rejected" || action === "verification_rejected") return X;
  if (action === "verification_approved") return ShieldCheck;
  if (action === "report_resolved") return Flag;
  if (action === "support_ticket_updated") return Headphones;
  if (action === "user_suspended") return Ban;
  return History;
}

function matchesActionFilter(action: string, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "user") return action === "user_suspended";
  return action.startsWith(filter);
}

function OversightView() {
  const [roster, setRoster] = useState<AdminUserRecord[]>([]);
  const [counts, setCounts] = useState<{ total: number; superAdmins: number } | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [admins, superAdmins, auditLogs] = await Promise.all([
          getAdminUsers({ accountType: "admin", role: "admin", pageSize: 24 }),
          getAdminUsers({ accountType: "super_admin", role: "admin", pageSize: 24 }),
          getAuditLogs(),
        ]);

        if (!active) return;

        const merged = [...superAdmins.data, ...admins.data];
        const seen = new Set<string>();
        const deduped = merged.filter((record) => {
          if (seen.has(record.id)) return false;
          seen.add(record.id);
          return true;
        });

        setRoster(deduped);
        setCounts({
          total: admins.meta.total + superAdmins.meta.total,
          superAdmins: superAdmins.meta.total,
        });
        setLogs(auditLogs.slice(0, 12));
      } catch (requestFailure) {
        if (!active) return;
        setError(
          requestFailure instanceof Error
            ? requestFailure.message
            : "Administrator records could not be loaded.",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const visibleLogs = useMemo(
    () => logs.filter((log) => matchesActionFilter(log.action, actionFilter)),
    [logs, actionFilter],
  );

  const selectedLog = useMemo(() => {
    if (visibleLogs.length === 0) return null;
    return visibleLogs.find((log) => log.id === selectedLogId) ?? visibleLogs[0];
  }, [visibleLogs, selectedLogId]);

  return (
    <>
      {error ? (
        <Panel className="border-amber-200 bg-amber-50 px-4 py-3" aria-label="Load error">
          <p className="text-sm font-semibold text-amber-900">Unable to load oversight data</p>
          <p className="mt-0.5 text-xs text-amber-900/80">{error}</p>
        </Panel>
      ) : null}

      <Panel aria-labelledby="administrator-roster-title">
        <PanelHeader
          title="Administrator accounts"
          count={
            counts ? (
              <span className="text-xs text-subtle tabular-nums">
                {counts.total.toLocaleString()} accounts, {counts.superAdmins.toLocaleString()} super
                administrators
              </span>
            ) : null
          }
          action={
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              Open in directory
              <ChevronRight size={13} aria-hidden="true" />
            </Link>
          }
        />

        {loading ? (
          <div className="space-y-2 p-4" aria-busy="true">
            <div className="h-9 animate-pulse rounded-md bg-[#f4f7f5]" />
            <div className="h-9 animate-pulse rounded-md bg-[#f4f7f5]" />
          </div>
        ) : roster.length === 0 ? (
          <EmptyState compact icon={Lock} title="No administrator accounts returned" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] table-fixed border-collapse" aria-label="Administrator accounts">
              <colgroup>
                <col style={{ width: "26%" }} />
                <col style={{ width: "30%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "14%" }} />
                <col />
              </colgroup>
              <thead className="bg-[#fafbfa]">
                <tr className="border-b border-hairline">
                  <th scope="col" className={TH}>Administrator</th>
                  <th scope="col" className={TH}>Email</th>
                  <th scope="col" className={TH}>Level</th>
                  <th scope="col" className={TH}>Access</th>
                  <th scope="col" className={cx(TH, "text-right")}>Action</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((record) => {
                  const name = `${record.firstName} ${record.lastName}`.trim();
                  return (
                    <tr key={record.id} className="transition-colors hover:bg-[#f7faf8]">
                      <td className="h-11 border-b border-hairline-soft px-4 align-middle">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[10px] font-semibold text-brand">
                            {initials(name || record.email || record.id)}
                          </span>
                          <span className="truncate text-sm font-medium text-ink">
                            {name || "Name not provided"}
                          </span>
                        </div>
                      </td>
                      <td className="h-11 truncate border-b border-hairline-soft px-4 align-middle text-sm text-muted">
                        {record.email ?? "Email not provided"}
                      </td>
                      <td className="h-11 truncate border-b border-hairline-soft px-4 align-middle text-sm text-ink">
                        {record.adminRole ? humanize(record.adminRole) : "Administrator"}
                      </td>
                      <td className="h-11 border-b border-hairline-soft px-4 align-middle">
                        <AdminStatusBadge status={record.accountStatus} />
                      </td>
                      <td className="h-11 border-b border-hairline-soft px-4 text-right align-middle">
                        <Link
                          href={`/admin/users/${encodeURIComponent(record.id)}`}
                          aria-label={`View account ${name || record.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                        >
                          View
                          <ChevronRight size={13} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel aria-labelledby="oversight-activity-title">
        <PanelHeader
          title="Administrative activity"
          action={
            <div className="flex items-center gap-3">
              <label htmlFor="oversight-action-filter" className="sr-only">
                Filter by action
              </label>
              <select
                id="oversight-action-filter"
                value={actionFilter}
                onChange={(event) => {
                  setActionFilter(event.target.value);
                  setSelectedLogId(null);
                }}
                className="h-8 rounded-lg border border-[#d9e1dc] bg-surface px-2 text-xs text-ink focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-[#0b5d3b]/15"
              >
                {ACTION_FILTERS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Link
                href="/admin/audit-logs"
                className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                Full audit trail
                <ChevronRight size={13} aria-hidden="true" />
              </Link>
            </div>
          }
        />

        {loading ? (
          <div className="space-y-2 p-4" aria-busy="true">
            <div className="h-9 animate-pulse rounded-md bg-[#f4f7f5]" />
            <div className="h-9 animate-pulse rounded-md bg-[#f4f7f5]" />
          </div>
        ) : visibleLogs.length === 0 ? (
          <EmptyState compact icon={History} title="No recorded actions for this filter" />
        ) : (
          <>
            <ul>
              {visibleLogs.slice(0, 7).map((log) => {
                const Icon = actionIcon(log.action);
                const selected = selectedLog?.id === log.id;
                return (
                  <li key={log.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedLogId(log.id)}
                      aria-pressed={selected}
                      className={cx(
                        "grid w-full grid-cols-1 items-center gap-1 border-b border-hairline-soft px-4 py-2.5 text-left transition-colors sm:grid-cols-[180px_190px_minmax(0,1fr)_112px] sm:gap-3",
                        selected ? "bg-brand-soft/60" : "hover:bg-[#f7faf8]",
                      )}
                    >
                      <span className="truncate text-[13px] font-medium text-ink">{log.actorName}</span>
                      <span
                        className={cx(
                          "flex items-center gap-1.5 truncate text-[13px]",
                          selected ? "font-medium text-ink" : "text-muted",
                        )}
                      >
                        <Icon size={13} aria-hidden="true" className="shrink-0 text-subtle" />
                        {humanize(log.action)}
                      </span>
                      <span className="truncate text-[13px] text-muted">
                        {log.description}
                      </span>
                      <span className="text-xs text-subtle tabular-nums sm:text-right">
                        {formatAuditStamp(log.createdAt)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {selectedLog ? (
              <div className="flex flex-wrap items-center gap-3 border-t border-hairline-soft bg-[#f7faf8] px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-brand">
                  {(() => {
                    const Icon = actionIcon(selectedLog.action);
                    return <Icon size={14} aria-hidden="true" />;
                  })()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-ink">{humanize(selectedLog.action)}</p>
                  <p className="mt-0.5 text-xs text-muted">{selectedLog.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-subtle">
                  <span className="rounded-full bg-surface px-2 py-0.5 font-mono">
                    {selectedLog.action}
                  </span>
                  <span className="rounded-full bg-surface px-2 py-0.5 font-mono">
                    {selectedLog.targetType} {compactId(selectedLog.targetId)}
                  </span>
                </div>
              </div>
            ) : null}
          </>
        )}
      </Panel>
    </>
  );
}
