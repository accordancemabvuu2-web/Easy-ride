export type ListingMode = "buy" | "rent";

export type VehicleRecord = {
  id: string;
  owner_id: string;
  dealer_id: string | null;
  listing_type: "sale" | "rent" | "sale_and_rent";
  status: "draft" | "pending_review" | "active" | "paused" | "sold" | "archived" | "rejected";
  make: string;
  model: string;
  trim: string | null;
  year: number;
  mileage_km: number | null;
  condition: "new" | "used" | "certified_pre_owned";
  fuel_type: string | null;
  transmission: string | null;
  body_type: string | null;
  sale_price: number | null;
  rent_day_price: number | null;
  rent_week_price: number | null;
  rent_month_price: number | null;
  currency: string;
  country_code: string | null;
  city: string | null;
  description: string;
  vehicle_images?: Array<{ id: string; storage_path: string; alt_text: string | null; display_order: number }>;
  created_at: string;
  published_at: string | null;
};

type ApiError = { error?: string; details?: unknown };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const payload = await response.json().catch(() => ({} as ApiError));
  if (!response.ok) {
    const error = payload as ApiError;
    throw new Error(error.error || `Request failed (${response.status}).`);
  }
  return payload as T;
}

export const easyRideApi = {
  vehicles(params: {
    q?: string;
    mode?: ListingMode;
    make?: string;
    city?: string;
    sort?: "newest" | "price_asc" | "price_desc";
    page?: number;
    pageSize?: number;
  } = {}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) query.set(key, String(value));
    }
    return requestJson<{ data: VehicleRecord[]; page: number; pageSize: number; total: number }>(
      `/api/vehicles${query.size ? `?${query.toString()}` : ""}`,
    );
  },

  vehicle(id: string) {
    return requestJson<{ data: VehicleRecord }>(`/api/vehicles/${encodeURIComponent(id)}`);
  },

  myVehicles(params: { status?: VehicleRecord["status"]; page?: number; pageSize?: number } = {}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) query.set(key, String(value));
    }
    return requestJson<{ data: VehicleRecord[]; page: number; pageSize: number; total: number }>(
      `/api/my/vehicles${query.size ? `?${query.toString()}` : ""}`,
      { cache: "no-store" },
    );
  },

  bookings(params: { role?: "all" | "buyer" | "seller"; type?: "rental" | "purchase"; status?: "pending" | "confirmed" | "completed" | "cancelled" | "declined" | "expired"; page?: number; pageSize?: number } = {}) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) query.set(key, String(value));
    }
    return requestJson<{ data: Array<Record<string, unknown>>; page: number; pageSize: number; total: number }>(
      `/api/bookings${query.size ? `?${query.toString()}` : ""}`,
      { cache: "no-store" },
    );
  },

  favorites() {
    return requestJson<{ data: Array<Record<string, unknown>> }>("/api/favorites", { cache: "no-store" });
  },

  createVehicle(input: Record<string, unknown>) {
    return requestJson<{ data: { id: string; status: string } }>("/api/vehicles", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateVehicle(id: string, input: Record<string, unknown>) {
    return requestJson<{ data: { id: string; status: string; updated_at: string } }>(
      `/api/vehicles/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    );
  },

  updateVehicleStatus(id: string, status: "draft" | "pending_review" | "paused" | "archived") {
    return requestJson<{ data: { id: string; status: string; updated_at: string } }>(
      `/api/vehicles/${encodeURIComponent(id)}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) },
    );
  },

  deleteVehicle(id: string) {
    return requestJson<{ ok: true }>(`/api/vehicles/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  saveVehicle(vehicleId: string) {
    return requestJson<{ ok: true; saved: true }>("/api/favorites", {
      method: "POST",
      body: JSON.stringify({ vehicleId }),
    });
  },

  unsaveVehicle(vehicleId: string) {
    const query = new URLSearchParams({ vehicleId });
    return requestJson<{ ok: true; saved: false }>(`/api/favorites?${query}`, { method: "DELETE" });
  },

  createRentalBooking(input: { vehicleId: string; startDate: string; endDate: string }) {
    return requestJson<{ bookingId: string; status: string; paymentStatus: string }>("/api/bookings", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  booking(id: string) {
    return requestJson<{ data: Record<string, unknown> }>(`/api/bookings/${encodeURIComponent(id)}`);
  },

  register(input: { name: string; email: string; password: string }) {
    return requestJson<{ ok: true; confirmationRequired: boolean; message: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  login(input: { email: string; password: string }) {
    return requestJson<{ ok: true; user: { id: string; email: string | undefined } }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  logout() {
    return requestJson<{ ok: true }>("/api/auth/logout", { method: "POST" });
  },

  requestPasswordReset(email: string) {
    return requestJson<{ ok?: true; message: string }>("/api/auth/password-reset", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  currentAccount() {
    return requestJson<{
      user: { id: string; email?: string } | null;
      profile: Record<string, unknown> | null;
      staffRoles: string[];
    }>("/api/auth/me", { cache: "no-store" });
  },

  profile() {
    return requestJson<{ data: Record<string, unknown> }>("/api/profile", { cache: "no-store" });
  },

  updateProfile(input: Record<string, unknown>) {
    return requestJson<{ data: Record<string, unknown> }>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  savedSearches() {
    return requestJson<{ data: Array<Record<string, unknown>> }>("/api/saved-searches");
  },

  saveSearch(input: Record<string, unknown>) {
    return requestJson<{ data: Record<string, unknown> }>("/api/saved-searches", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateSavedSearch(id: string, input: Record<string, unknown>) {
    return requestJson<{ data: Record<string, unknown> }>(`/api/saved-searches/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  deleteSavedSearch(id: string) {
    return requestJson<{ ok: true }>(`/api/saved-searches/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  dealerApplications() {
    return requestJson<{ data: Array<Record<string, unknown>> }>("/api/dealer-applications");
  },

  applyAsDealer(input: Record<string, unknown>) {
    return requestJson<{ data: { id: string; status: string; submitted_at: string } }>("/api/dealer-applications", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
