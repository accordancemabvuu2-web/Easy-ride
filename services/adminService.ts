"use client";

import { db, firebaseReady } from "@/lib/firebase";
import type { EasyRideNotification } from "@/Types/notification";
import type { Vehicle } from "@/Types/vehicle";
import { collection, getDocs } from "firebase/firestore";
import { ApiError, api } from "@/lib/apiClient";
import type { AdminUsersQuery, AdminUsersResponse, AdminUserRecord } from "@/Types/user";

const BOOKINGS_CACHE_KEY = "easy-ride:bookings";
const OFFERS_CACHE_KEY = "easy-ride:offers";
const PAYMENTS_CACHE_KEY = "easy-ride:payments";
const SUPPORT_CACHE_KEY = "easy-ride:support-tickets";
const REPORTS_CACHE_KEY = "easy-ride:reports";
const VERIFICATION_CACHE_KEY = "easy-ride:verification-requests";
const AUDIT_CACHE_KEY = "easy-ride:audit-logs";

function readLocalRecords<T>(key: string): T[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(key);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function invalidAdminUsersResponse(): never {
  throw new ApiError("The admin users API returned an invalid response.", "INVALID_RESPONSE", 502);
}

function parseAdminUser(value: unknown): AdminUserRecord {
  if (!isRecord(value)) return invalidAdminUsersResponse();

  const roles = ["user", "dealer", "admin"];
  const accountTypes = ["buyer", "seller", "dealer"];
  const adminRoles = ["super_admin", "operations", "verification", "support"];
  const accountStatuses = ["pending", "active", "suspended", "deleted"];
  const dealerStatuses = ["pending", "under_review", "verified", "rejected", "suspended"];

  if (
    typeof value.id !== "string" ||
    typeof value.firstName !== "string" ||
    typeof value.lastName !== "string" ||
    !isNullableString(value.email) ||
    !isNullableString(value.phoneNumber) ||
    typeof value.role !== "string" || !roles.includes(value.role) ||
    !(value.accountType === null || (typeof value.accountType === "string" && accountTypes.includes(value.accountType))) ||
    !(value.adminRole === null || (typeof value.adminRole === "string" && adminRoles.includes(value.adminRole))) ||
    typeof value.accountStatus !== "string" || !accountStatuses.includes(value.accountStatus) ||
    !isNullableString(value.emailVerifiedAt) ||
    typeof value.createdAt !== "string" ||
    !isNullableString(value.lastLoginAt) ||
    !(value.dealerVerificationStatus === null || (typeof value.dealerVerificationStatus === "string" && dealerStatuses.includes(value.dealerVerificationStatus)))
  ) {
    return invalidAdminUsersResponse();
  }

  return {
    id: value.id,
    firstName: value.firstName,
    lastName: value.lastName,
    email: value.email,
    phoneNumber: value.phoneNumber,
    role: value.role as AdminUserRecord["role"],
    accountType: value.accountType as AdminUserRecord["accountType"],
    adminRole: value.adminRole as AdminUserRecord["adminRole"],
    accountStatus: value.accountStatus as AdminUserRecord["accountStatus"],
    emailVerifiedAt: value.emailVerifiedAt,
    createdAt: value.createdAt,
    lastLoginAt: value.lastLoginAt,
    dealerVerificationStatus: value.dealerVerificationStatus as AdminUserRecord["dealerVerificationStatus"],
  };
}

function parseAdminUsersResponse(value: unknown): AdminUsersResponse {
  if (!isRecord(value) || value.success !== true || !Array.isArray(value.data) || !isRecord(value.meta)) {
    return invalidAdminUsersResponse();
  }

  const { page, pageSize, total, totalPages } = value.meta;
  if (
    !Number.isInteger(page) || (page as number) < 1 ||
    !Number.isInteger(pageSize) || (pageSize as number) < 1 || (pageSize as number) > 100 ||
    !Number.isInteger(total) || (total as number) < 0 ||
    !Number.isInteger(totalPages) || (totalPages as number) < 0
  ) {
    return invalidAdminUsersResponse();
  }

  return {
    success: true,
    data: value.data.map(parseAdminUser),
    meta: {
      page: page as number,
      pageSize: pageSize as number,
      total: total as number,
      totalPages: totalPages as number,
    },
  };
}

export async function getAdminUsers(
  query: AdminUsersQuery = {},
  options: Pick<RequestInit, "signal"> = {},
): Promise<AdminUsersResponse> {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 24;
  const search = query.search?.trim();
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw new ApiError("The admin users page parameters are invalid.", "VALIDATION_ERROR", 400);
  }
  if (search && search.length > 100) {
    throw new ApiError("Search must be 100 characters or fewer.", "VALIDATION_ERROR", 400);
  }

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    status: query.status ?? "all",
  });
  if (search) params.set("search", search);
  if (query.accountType) params.set("accountType", query.accountType);
  if (query.role) params.set("role", query.role);

  const response = await api.get<unknown>(`/admin/users?${params.toString()}`, options);
  return parseAdminUsersResponse(response);
}

export async function getAdminUserCount(): Promise<number> {
  const response = await api.get<unknown>("/admin/dashboard");
  if (!isRecord(response.data) || !Number.isInteger(response.data.users) || (response.data.users as number) < 0) {
    return invalidAdminUsersResponse();
  }
  return response.data.users as number;
}

export async function getAdminListings(): Promise<Vehicle[]> {
  if (!firebaseReady || !db) {
    return readLocalRecords<Vehicle>("easy-ride:listings");
  }

  const snapshot = await getDocs(collection(db, "listings"));
  return snapshot.docs.map((listingDocument) => ({
    id: listingDocument.id,
    ...(listingDocument.data() as Omit<Vehicle, "id">),
  }));
}

export async function getAdminNotifications(): Promise<EasyRideNotification[]> {
  if (!firebaseReady || !db) {
    return readLocalRecords<EasyRideNotification>("easy-ride:notifications");
  }

  const snapshot = await getDocs(collection(db, "notifications"));
  return snapshot.docs.map((notificationDocument) => ({
    id: notificationDocument.id,
    ...(notificationDocument.data() as Omit<EasyRideNotification, "id">),
  }));
}

export async function getAdminSummary() {
  if (!firebaseReady || !db) {
    return {
      users: await getAdminUserCount(),
      listings: readLocalRecords<Vehicle>("easy-ride:listings").length,
      bookings: readLocalRecords(BOOKINGS_CACHE_KEY).length,
      offers: readLocalRecords(OFFERS_CACHE_KEY).length,
      payments: readLocalRecords(PAYMENTS_CACHE_KEY).length,
      supportTickets: readLocalRecords(SUPPORT_CACHE_KEY).length,
      reports: readLocalRecords(REPORTS_CACHE_KEY).length,
      verificationRequests: readLocalRecords(VERIFICATION_CACHE_KEY).length,
      auditLogs: readLocalRecords(AUDIT_CACHE_KEY).length,
    };
  }

  const [users, listings, bookings, offers, payments, supportTickets, reports, verificationRequests, auditLogs] =
    await Promise.all([
      getAdminUserCount(),
      getAdminListings(),
      getDocs(collection(db, "bookings")),
      getDocs(collection(db, "offers")),
      getDocs(collection(db, "payments")),
      getDocs(collection(db, "supportTickets")),
      getDocs(collection(db, "reports")),
      getDocs(collection(db, "verificationRequests")),
      getDocs(collection(db, "auditLogs")),
    ]);

  return {
    users,
    listings: listings.length,
    bookings: bookings.size,
    offers: offers.size,
    payments: payments.size,
    supportTickets: supportTickets.size,
    reports: reports.size,
    verificationRequests: verificationRequests.size,
    auditLogs: auditLogs.size,
  };
}
