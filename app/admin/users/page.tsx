"use client";

import AdminStatusBadge from "@/Components/AdminStatusBadge";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/apiClient";
import { getAdminUsers } from "@/lib/clientFirebaseServices";
import type {
  AdminUserRecord,
  AdminUserStatusFilter,
  AdminUsersQuery,
  AdminUsersResponse,
} from "@/Types/user";
import { Eye, Loader2, Search, ShieldAlert, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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

function accountCategoryQuery(category: AccountCategory): Pick<AdminUsersQuery, "accountType" | "role"> {
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
    message: error instanceof Error
      ? error.message
      : "The users could not be loaded. Please try again.",
  };
}

export default function AdminUsersPage() {
  const { isSuperAdmin } = useAuth();
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
    if (!isSuperAdmin) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const controller = new AbortController();
    const categoryFilters = accountCategoryQuery(accountCategory);
    const query: AdminUsersQuery = {
      ...categoryFilters,
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
  }, [accountCategory, isSuperAdmin, page, retryCount, search, status]);

  if (!isSuperAdmin) {
    return (
      <section className="flex min-h-[60vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto text-amber-700" size={40} />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Super administrator access required</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            User management is available to super administrators only.
          </p>
        </div>
      </section>
    );
  }

  const totalPages = result?.meta.totalPages ?? 0;
  const currentPage = result?.meta.page ?? page;

  return (
    <section className="min-h-screen px-4 py-8 sm:px-6 lg:px-8 lg:pl-8" aria-busy={loading || refreshing}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Users className="text-[#0B5D3B]" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">Users</p>
              <h1 className="text-4xl font-bold">User management</h1>
              {result && <p className="mt-1 text-sm text-gray-500">{result.meta.total} matching users</p>}
            </div>
          </div>
          {refreshing && (
            <span className="inline-flex items-center gap-2 text-sm text-gray-500" role="status">
              <Loader2 className="animate-spin" size={16} /> Updating results
            </span>
          )}
        </div>

        <div className="mb-5 grid gap-3 rounded-3xl bg-white p-4 shadow-sm sm:grid-cols-[minmax(220px,1fr)_210px_180px]">
          <label className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] px-4 py-3">
            <Search className="shrink-0 text-gray-400" size={18} />
            <input
              aria-label="Search users"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search name, email, phone, or ID"
              maxLength={100}
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <label className="sr-only" htmlFor="admin-user-category">Filter account category</label>
          <select
            id="admin-user-category"
            value={accountCategory}
            onChange={(event) => {
              setAccountCategory(event.target.value as AccountCategory);
              setPage(1);
            }}
            className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm outline-none"
          >
            <option value="all">All account types</option>
            <option value="buyer">Buyer</option>
            <option value="seller">Individual seller</option>
            <option value="pending-dealer">Pending dealer</option>
            <option value="approved-dealer">Approved dealer</option>
            <option value="administrator">Administrator</option>
            <option value="super-administrator">Super administrator</option>
          </select>
          <label className="sr-only" htmlFor="admin-user-status">Filter account status</label>
          <select
            id="admin-user-status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as AdminUserStatusFilter);
              setPage(1);
            }}
            className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm outline-none"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending account</option>
            <option value="active">Active account</option>
            <option value="suspended">Suspended account</option>
            <option value="deleted">Deleted account</option>
          </select>
        </div>

        {searchInput.trim() !== search && (
          <p className="mb-3 text-sm text-gray-500" role="status">Waiting to search…</p>
        )}

        {error && (
          <div className={`mb-5 rounded-2xl border p-4 ${error.kind === "forbidden" || error.kind === "unauthorized" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-800"}`} role="alert">
            <p className="font-semibold">
              {error.kind === "forbidden" ? "Access denied" : error.kind === "unauthorized" ? "Session expired" : "Unable to load users"}
            </p>
            <p className="mt-1 text-sm">{error.message}</p>
            {error.kind === "request" && (
              <button
                type="button"
                onClick={() => setRetryCount((count) => count + 1)}
                className="mt-3 rounded-full border border-red-300 px-4 py-2 text-sm font-semibold hover:bg-red-100"
              >
                Try again
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-80 items-center justify-center rounded-3xl border border-[#E5E7EB] bg-white" role="status" aria-label="Loading users">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
          </div>
        ) : !error && result && (
          <>
            <div className="overflow-x-auto rounded-3xl border border-[#E5E7EB] bg-white shadow-sm">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[2fr_1.2fr_1fr_auto] gap-4 border-b border-[#E5E7EB] px-5 py-4 text-sm font-semibold text-gray-500">
                  <div>User</div>
                  <div>Email</div>
                  <div>Account type</div>
                  <div className="w-32">Actions</div>
                </div>
                {result.data.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No users found for these filters.</div>
                ) : (
                  result.data.map((user) => {
                    const presentation = accountPresentation(user);
                    const name = `${user.firstName} ${user.lastName}`.trim();
                    return (
                      <div key={user.id} className="grid grid-cols-[2fr_1.2fr_1fr_auto] items-center gap-4 border-b border-[#F0F1F2] px-5 py-4 last:border-b-0">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{name || "Name not provided"}</p>
                          <p className="truncate text-sm text-gray-500">{user.id}</p>
                        </div>
                        <div className="truncate text-sm text-gray-600">{user.email ?? "Email not provided"}</div>
                        <div className="flex flex-col items-start gap-1">
                          <AdminStatusBadge status={presentation.status} label={presentation.label} />
                          <span className="text-xs capitalize text-gray-500">{user.accountStatus.replaceAll("_", " ")}</span>
                        </div>
                        <Link
                          href={`/admin/users/${encodeURIComponent(user.id)}`}
                          aria-label={`View details for ${name || user.id}`}
                          className="inline-flex w-32 items-center justify-center gap-2 rounded-full border border-[#0B5D3B] px-3 py-2 text-sm font-semibold text-[#0B5D3B] transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B5D3B]"
                        >
                          <Eye size={16} aria-hidden="true" />
                          View details
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {totalPages > 0 && (
              <nav className="mt-5 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between" aria-label="User list pagination">
                <p className="text-sm text-gray-600" aria-live="polite">
                  Page {currentPage} of {totalPages} · {result.meta.total} matching users
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={currentPage <= 1 || refreshing}
                    className="rounded-full border border-[#D1D5DB] px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={currentPage >= totalPages || refreshing}
                    className="rounded-full bg-[#0B5D3B] px-5 py-2 text-sm font-semibold text-white hover:bg-[#084B30] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  );
}
