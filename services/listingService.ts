"use client";

import { ApiError, api } from "@/lib/apiClient";
import type { ListingStatus, ListingType, Vehicle } from "@/Types/vehicle";
import { adaptVehicle } from "@/services/vehicleAdapter";

const LISTING_PAGE_SIZE = 20;
const INVENTORY_PAGE_SIZE = 100;
const MAX_VEHICLE_IMAGES = 10;

export interface ApiListingCursor {
  source: "api";
  page: number;
}

export interface ListingPage {
  listings: Vehicle[];
  lastDocument: ApiListingCursor | null;
  hasMore: boolean;
}

export interface ListingPageFilters {
  listingType?: ListingType | "all";
  search?: string;
  location?: string;
  make?: string;
  model?: string;
  bodyType?: string;
  transmission?: string;
  fuelType?: string;
  condition?: string;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  mileageMax?: number;
  sortBy?: "newest" | "price-asc" | "price-desc" | "year-desc" | "year-asc" | "views-desc";
}

interface VehicleListResponse {
  data?: unknown;
  meta?: { page?: number; pageSize?: number; total?: number };
}

function recordsFrom(response: VehicleListResponse): unknown[] {
  return Array.isArray(response.data) ? response.data : [];
}

function countryCode(country: string): string {
  const value = country.trim();
  if (/^[a-z]{2}$/i.test(value)) return value.toUpperCase();
  const knownCountries: Record<string, string> = {
    zimbabwe: "ZW",
    "south africa": "ZA",
    zambia: "ZM",
    malawi: "MW",
    botswana: "BW",
    mozambique: "MZ",
    namibia: "NA",
    lesotho: "LS",
    eswatini: "SZ",
  };
  return knownCountries[value.toLowerCase()] ?? value.slice(0, 2).toUpperCase();
}

function backendCondition(condition: Vehicle["condition"]): "new" | "used" | "certified_pre_owned" {
  if (condition === "New") return "new";
  if (condition === "Excellent") return "certified_pre_owned";
  return "used";
}

export function toVehicleWritePayload(input: Partial<Vehicle>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (input.make !== undefined) payload.make = input.make.trim();
  if (input.model !== undefined) payload.model = input.model.trim();
  if (input.year !== undefined) payload.year = input.year;
  if (input.condition !== undefined) payload.condition = backendCondition(input.condition);
  if (input.description !== undefined) payload.description = input.description.trim();
  if (input.currency !== undefined) payload.currency = input.currency.toUpperCase();
  if (input.mileage !== undefined) payload.mileage = input.mileage;
  if (input.bodyType !== undefined) payload.bodyType = input.bodyType;
  if (input.transmission !== undefined) payload.transmission = input.transmission.toLowerCase();
  if (input.fuelType !== undefined) payload.fuelType = input.fuelType.toLowerCase();
  if (input.drivetrain !== undefined) payload.drivetrain = input.drivetrain;
  if (input.engineCapacity !== undefined) payload.engineCapacity = input.engineCapacity;
  if (input.color !== undefined) payload.exteriorColor = input.color;
  if (input.features !== undefined) payload.features = input.features;
  if (input.listingType !== undefined) {
    payload.listingType = input.listingType === "rent" ? "rent" : input.listingType === "both" ? "sale_and_rent" : "sale";
  }
  if (input.price !== undefined && input.listingType !== "rent") {
    payload.salePrice = input.salePrice ?? input.price;
  } else if (input.salePrice !== undefined) {
    payload.salePrice = input.salePrice;
  }
  if (input.listingType === "rent" || input.listingType === "both") {
    const rental: NonNullable<Vehicle["rentalPricing"]> = { ...(input.rentalPricing ?? {}) };
    if (input.listingType === "rent" && input.price !== undefined) rental.day = input.price;
    payload.rentalPricing = Object.fromEntries(
      Object.entries(rental).filter(([, amount]) => amount !== undefined),
    );
  } else if (input.rentalPricing !== undefined) {
    payload.rentalPricing = input.rentalPricing;
  }
  if (input.location !== undefined) {
    payload.city = input.location.city;
    payload.country = countryCode(input.location.country);
    payload.address = input.location.address;
    if (Number.isFinite(input.location.latitude) && Number.isFinite(input.location.longitude)) {
      payload.location = { type: "Point", coordinates: [input.location.longitude, input.location.latitude] };
    }
  }
  return payload;
}

function mapListingFilters(filters: ListingPageFilters, page: number): URLSearchParams {
  const params = new URLSearchParams({ page: String(page), pageSize: String(LISTING_PAGE_SIZE) });
  const values: Array<[string, string | number | undefined]> = [
    ["q", filters.search?.trim()],
    ["city", filters.location],
    ["make", filters.make],
    ["model", filters.model],
    ["bodyType", filters.bodyType],
    ["transmission", filters.transmission?.toLowerCase()],
    ["fuelType", filters.fuelType?.toLowerCase()],
    ["condition", filters.condition ? backendCondition(filters.condition as Vehicle["condition"]) : undefined],
    ["minPrice", filters.priceMin],
    ["maxPrice", filters.priceMax],
    ["yearMin", filters.yearMin],
    ["yearMax", filters.yearMax],
    ["mileageMax", filters.mileageMax],
  ];
  for (const [key, value] of values) {
    if (value !== undefined && value !== "" && value !== "all") params.set(key, String(value));
  }
  if (filters.listingType && filters.listingType !== "all") {
    params.set("listingType", filters.listingType === "rent" ? "rent" : filters.listingType === "both" ? "sale_and_rent" : "sale");
  }
  const sort = filters.sortBy ?? "newest";
  params.set("sort", sort.replaceAll("-", "_"));
  return params;
}

async function listPage(endpoint: string, page: number, pageSize = INVENTORY_PAGE_SIZE): Promise<{ listings: Vehicle[]; hasMore: boolean }> {
  const response = await api.get<unknown>(`${endpoint}${endpoint.includes("?") ? "&" : "?"}${new URLSearchParams({ page: String(page), pageSize: String(pageSize) })}`);
  const body = response as VehicleListResponse;
  const items = recordsFrom(body).map(adaptVehicle);
  const total = body.meta?.total;
  return { listings: items, hasMore: typeof total === "number" ? page * pageSize < total : items.length === pageSize };
}

export async function getActiveListingPage(
  filters: ListingPageFilters = {},
  lastDocument?: ApiListingCursor | null,
): Promise<ListingPage> {
  const pageNumber = lastDocument?.source === "api" ? lastDocument.page : 1;
  const params = mapListingFilters(filters, pageNumber);
  const response = (await api.get<unknown>(`/vehicles?${params.toString()}`)) as VehicleListResponse;
  const listings = recordsFrom(response).map(adaptVehicle);
  const total = response.meta?.total;
  const hasMore = typeof total === "number" ? pageNumber * LISTING_PAGE_SIZE < total : listings.length === LISTING_PAGE_SIZE;
  return {
    listings,
    lastDocument: listings.length && hasMore ? { source: "api", page: pageNumber + 1 } : null,
    hasMore,
  };
}

export async function getActiveListings(): Promise<Vehicle[]> {
  const listings: Vehicle[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const result = await listPage("/vehicles", page);
    listings.push(...result.listings);
    hasMore = result.hasMore;
    page += 1;
  }
  return listings;
}

export async function getPendingListings(): Promise<Vehicle[]> {
  const listings: Vehicle[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const result = await listPage("/admin/vehicles?status=pending_review", page);
    listings.push(...result.listings);
    hasMore = result.hasMore;
    page += 1;
  }
  return listings;
}

export async function getMyListings(_ownerId?: string): Promise<Vehicle[]> {
  const listings: Vehicle[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const result = await listPage("/vehicles/me", page);
    listings.push(...result.listings);
    hasMore = result.hasMore;
    page += 1;
  }
  return listings;
}

export async function getListingById(id: string): Promise<Vehicle | null> {
  try {
    const response = await api.get<unknown>(`/vehicles/${encodeURIComponent(id)}`);
    return response.data ? adaptVehicle(response.data) : null;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}

export async function getAdminListingById(id: string): Promise<Vehicle | null> {
  try {
    const response = await api.get<unknown>(`/admin/vehicles/${encodeURIComponent(id)}`);
    return response.data ? adaptVehicle(response.data) : null;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) return null;
    throw error;
  }
}

export type VehicleListingInput = Omit<Vehicle, "id" | "status" | "views" | "favoritesCount" | "createdAt" | "updatedAt">;

export async function createListing(listing: VehicleListingInput): Promise<Vehicle> {
  const response = await api.post<unknown>("/vehicles", toVehicleWritePayload(listing));
  const data = response.data && typeof response.data === "object" ? response.data as Record<string, unknown> : {};
  const id = String(data.id ?? data._id ?? "");
  if (!id) throw new ApiError("The vehicle creation response did not include its ID.", "INVALID_RESPONSE", 502);
  return adaptVehicle({
    ...listing,
    _id: id,
    sellerId: listing.ownerId,
    dealerId: listing.dealerId,
    moderationStatus: data.moderationStatus ?? "pending_review",
    availabilityStatus: "available",
    viewCount: 0,
    images: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function updateListing(listingId: string, changes: Partial<Vehicle>): Promise<Vehicle> {
  const current = (await getMyListings()).find((listing) => listing.id === listingId);
  if (!current) throw new ApiError("The vehicle could not be found in your inventory.", "NOT_FOUND", 404);
  await api.patch(`/vehicles/${encodeURIComponent(listingId)}`, toVehicleWritePayload({
    ...changes,
    listingType: changes.listingType ?? current.listingType,
    rentalPricing: changes.rentalPricing ?? current.rentalPricing,
  }));
  const updated = (await getMyListings()).find((listing) => listing.id === listingId);
  if (!updated) throw new ApiError("The updated vehicle could not be reloaded.", "INVALID_RESPONSE", 502);
  return updated;
}

export async function updateListingStatus(listingId: string, status: ListingStatus, reason?: string): Promise<void> {
  const id = encodeURIComponent(listingId);
  if (status === "active") {
    const current = await getAdminListingById(listingId);
    if (!current) throw new ApiError("The listing could not be found.", "NOT_FOUND", 404);
    if (current.status === "suspended") {
      await api.patch(`/admin/vehicles/${id}/status`, { moderationStatus: "published" });
    } else if (current.status === "pending") {
      await api.patch(`/admin/vehicles/${id}/review`, { decision: "approve" });
    } else {
      throw new ApiError("Only a pending or suspended listing can be made active.", "INVALID_STATE", 409);
    }
    return;
  }
  if (status === "rejected") {
    if (!reason?.trim()) throw new ApiError("A rejection reason is required.", "VALIDATION_ERROR", 400);
    await api.patch(`/admin/vehicles/${id}/review`, { decision: "reject", reason: reason.trim() });
    return;
  }
  if (status === "suspended") {
    if (!reason?.trim()) throw new ApiError("A suspension reason is required.", "VALIDATION_ERROR", 400);
    await api.patch(`/admin/vehicles/${id}/status`, { moderationStatus: "suspended", reason: reason.trim() });
    return;
  }
  if (status === "pending" || status === "draft") {
    await api.post(`/vehicles/${id}/publish`);
    return;
  }
  const availabilityStatus = status === "sold" ? "sold" : status === "rented" ? "rented" : status === "archived" ? "archived" : null;
  if (availabilityStatus) {
    await api.patch(`/vehicles/${id}/availability`, { availabilityStatus });
    return;
  }
  throw new ApiError("This status can only be changed by an administrator.", "FORBIDDEN", 403);
}

export async function deleteListing(listingId: string): Promise<void> {
  await api.delete(`/vehicles/${encodeURIComponent(listingId)}`);
}

export interface VehicleAvailability {
  vehicleId: string;
  available: boolean;
  startDate: string;
  endDate: string;
}

export async function getVehicleAvailability(
  listingId: string,
  startDate: Date | string,
  endDate: Date | string,
): Promise<VehicleAvailability> {
  const params = new URLSearchParams({
    startDate: typeof startDate === "string" ? startDate : startDate.toISOString(),
    endDate: typeof endDate === "string" ? endDate : endDate.toISOString(),
  });
  const response = await api.get<VehicleAvailability>(`/vehicles/${encodeURIComponent(listingId)}/availability?${params}`);
  if (!response.data || typeof response.data.available !== "boolean") {
    throw new ApiError("The availability response was invalid.", "INVALID_RESPONSE", 502);
  }
  return response.data;
}

export interface UploadedVehicleImage {
  id: string;
  imageUrl: string;
  displayOrder: number;
}

export async function uploadVehicleImages(vehicleId: string, files: File[]): Promise<UploadedVehicleImage[]> {
  if (!files.length) return [];
  if (files.length > MAX_VEHICLE_IMAGES) {
    throw new ApiError(`You can upload up to ${MAX_VEHICLE_IMAGES} vehicle photos.`, "VALIDATION_ERROR", 400);
  }
  if (files.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
    throw new ApiError("Vehicle photos must be JPEG, PNG, or WebP files no larger than 5 MiB each.", "VALIDATION_ERROR", 400);
  }
  const form = new FormData();
  files.forEach((file) => form.append("images", file, file.name));
  const response = await api.post<unknown>(`/vehicles/${encodeURIComponent(vehicleId)}/images`, form);
  if (!Array.isArray(response.data)) throw new ApiError("The image upload response was invalid.", "INVALID_RESPONSE", 502);
  return response.data.map((item) => {
    const image = item as Record<string, unknown>;
    return {
      id: String(image.id ?? image._id ?? ""),
      imageUrl: String(image.imageUrl ?? ""),
      displayOrder: typeof image.displayOrder === "number" ? image.displayOrder : 0,
    };
  });
}
