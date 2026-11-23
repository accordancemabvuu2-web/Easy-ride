"use client";

import { getListingById } from "@/services/listingService";
import { createNotification } from "@/services/notificationService";
import { api } from "@/lib/apiClient";
import type { Vehicle } from "@/Types/vehicle";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

async function getFavoriteIds(): Promise<string[]> {
  const ids: string[] = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;
  const pageSize = 100;
  while (ids.length < total) {
    const response = await api.get<unknown>(`/vehicles/me/saved?page=${page}&pageSize=${pageSize}`);
    const meta = asRecord(response.meta);
    const records = Array.isArray(response.data) ? response.data : [];
    total = typeof meta.total === "number" ? meta.total : ids.length + records.length;
    for (const record of records) {
      const vehicle = asRecord(asRecord(record).vehicleId);
      const id = vehicle._id ?? vehicle.id ?? asRecord(record).vehicleId;
      if (typeof id === "string" && id) ids.push(id);
    }
    if (records.length < pageSize) break;
    page += 1;
    if (!Number.isFinite(total)) break;
  }
  return ids;
}

async function notifyOwnerAboutFavorite(listing: Vehicle, userId: string) {
  if (listing.ownerId === userId) {
    return;
  }

  await createNotification({
    userId: listing.ownerId,
    type: "listing",
    title: "Your listing was saved",
    message: `${listing.make} ${listing.model} ${listing.year} was added to favorites.`,
    actionUrl: `/vehicle/${listing.id}`,
    link: `/vehicle/${listing.id}`,
  });
}

export async function addFavorite(
  userId: string,
  listingId: string,
): Promise<void> {
  const alreadySaved = (await getFavoriteIds()).includes(listingId);
  await api.put(`/vehicles/me/saved/${encodeURIComponent(listingId)}`);
  if (alreadySaved) return;
  const listing = await getListingById(listingId);
  if (listing) await notifyOwnerAboutFavorite(listing, userId);
}

export async function removeFavorite(
  userId: string,
  listingId: string,
): Promise<void> {
  void userId;
  await api.delete(`/vehicles/me/saved/${encodeURIComponent(listingId)}`);
}

export async function isFavorite(
  userId: string,
  listingId: string,
): Promise<boolean> {
  void userId;
  return (await getFavoriteIds()).includes(listingId);
}

export async function getUserFavoriteListings(
  userId: string,
): Promise<Vehicle[]> {
  void userId;
  const ids = await getFavoriteIds();
  const listings: Vehicle[] = [];
  for (let index = 0; index < ids.length; index += 8) {
    const page = await Promise.all(ids.slice(index, index + 8).map(getListingById));
    listings.push(...page.filter((listing): listing is Vehicle => listing !== null));
  }
  return listings;
}
