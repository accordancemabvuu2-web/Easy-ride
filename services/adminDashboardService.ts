import { ApiError, api } from "@/lib/apiClient";
import { adaptVehicle } from "@/services/vehicleAdapter";
import type { Vehicle } from "@/Types/vehicle";

type UnknownRecord = Record<string, unknown>;

export interface AdminDashboardCounts {
  users: number;
  dealersPending: number;
  vehiclesPending: number;
  openReports: number;
  openSupport: number;
  bookings: number;
  payments: number;
  offers: number;
}

export interface AdminDashboardData {
  counts: AdminDashboardCounts;
  pendingListings: Vehicle[];
}

const COUNT_KEYS: Array<keyof AdminDashboardCounts> = [
  "users",
  "dealersPending",
  "vehiclesPending",
  "openReports",
  "openSupport",
  "bookings",
  "payments",
  "offers",
];

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidDashboardResponse(): never {
  throw new ApiError(
    "The admin dashboard API returned an invalid response.",
    "INVALID_RESPONSE",
    502,
  );
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const [dashboardResponse, listingsResponse] = await Promise.all([
    api.get<unknown>("/admin/dashboard"),
    api.get<unknown>("/admin/vehicles?status=pending_review&page=1&pageSize=4"),
  ]);

  if (!isRecord(dashboardResponse.data)) return invalidDashboardResponse();
  const counts = {} as AdminDashboardCounts;
  for (const key of COUNT_KEYS) {
    const value = dashboardResponse.data[key];
    if (!Number.isInteger(value) || (value as number) < 0) return invalidDashboardResponse();
    counts[key] = value as number;
  }

  if (
    !Array.isArray(listingsResponse.data) ||
    !isRecord(listingsResponse.meta) ||
    !Number.isInteger(listingsResponse.meta.total) ||
    (listingsResponse.meta.total as number) < 0
  ) {
    return invalidDashboardResponse();
  }

  const pendingListings = listingsResponse.data.map(adaptVehicle);
  if (pendingListings.some((listing) => !listing.id || listing.status !== "pending")) {
    return invalidDashboardResponse();
  }

  return { counts, pendingListings };
}
