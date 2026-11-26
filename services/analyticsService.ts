"use client";

import { ApiError, api } from "@/lib/apiClient";
import type { Vehicle } from "@/Types/vehicle";

export interface SellerAnalytics {
  views: number;
  favorites: number;
  leadCount: number;
  conversionRate: number;
  listings: Array<
    Partial<Vehicle> & {
      id: string;
      views: number;
      favoritesCount: number;
      leadCount: number;
    }
  >;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function countValue(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new ApiError("The inventory analytics API returned invalid counts.", "INVALID_RESPONSE", 502);
  }
  return value;
}

function invalidResponse(): never {
  throw new ApiError("The inventory analytics API returned an invalid response.", "INVALID_RESPONSE", 502);
}

export async function recordListingView(
  listingId: string,
  userId?: string,
): Promise<void> {
  // Vehicle detail reads increment viewCount in the MongoDB API.
  void listingId;
  void userId;
}

export async function recordContactClick(
  listingId: string,
  sellerId: string,
  buyerId?: string,
  contactMethod: "whatsapp" | "phone" | "message" = "whatsapp",
): Promise<void> {
  // Only backend conversation creation is counted as an enquiry.
  void listingId;
  void sellerId;
  void buyerId;
  void contactMethod;
}

export async function getSellerAnalytics(ownerId: string): Promise<SellerAnalytics> {
  void ownerId;
  const response = await api.get<unknown>("/vehicles/me/analytics");
  const record = asRecord(response.data);
  if (!Array.isArray(record.listings)) return invalidResponse();

  const listings = record.listings.map((value) => {
    const listing = asRecord(value);
    if (typeof listing.id !== "string" || !listing.id) return invalidResponse();
    return {
      id: listing.id,
      make: typeof listing.make === "string" ? listing.make : undefined,
      model: typeof listing.model === "string" ? listing.model : undefined,
      year: typeof listing.year === "number" ? listing.year : undefined,
      views: countValue(listing.views),
      favoritesCount: countValue(listing.favorites),
      leadCount: countValue(listing.messageEnquiries),
    };
  });
  const views = countValue(record.views);
  const favorites = countValue(record.favorites);
  const leadCount = countValue(record.messageEnquiries);
  return {
    views,
    favorites,
    leadCount,
    conversionRate: views > 0 ? (leadCount / views) * 100 : 0,
    listings,
  };
}
