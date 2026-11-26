"use client";

import { ApiError, api } from "@/lib/apiClient";
import type { OfferStatus, VehicleOffer } from "@/Types/offer";
import type { Vehicle } from "@/Types/vehicle";

type UnknownRecord = Record<string, unknown>;

interface CreateOfferInput {
  vehicle: Vehicle;
  buyer: { id: string; name: string; email: string; phone: string };
  offeredPrice: number;
  message: string;
}

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function recordId(value: unknown): string {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  const id = record._id ?? record.id;
  return typeof id === "string" ? id : "";
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function unsupported(message: string): never {
  throw new ApiError(message, "FEATURE_UNAVAILABLE", 501);
}

function mapOffer(value: unknown, currentUserId = ""): VehicleOffer {
  const record = asRecord(value);
  const vehicle = asRecord(record.vehicleId);
  const id = recordId(record);
  const listingId = recordId(record.vehicleId);
  const buyerId = recordId(record.buyerId);
  const sellerId = recordId(record.sellerId);
  const status = record.status;

  if (
    !id ||
    !listingId ||
    !buyerId ||
    !sellerId ||
    !["pending", "accepted", "rejected", "withdrawn", "expired"].includes(String(status))
  ) {
    throw new ApiError("The offers API returned an invalid record.", "INVALID_RESPONSE", 502);
  }

  const titleParts = [vehicle.make, vehicle.model, vehicle.year]
    .filter((part) => typeof part === "string" || typeof part === "number");
  const listingTitle = titleParts.join(" ") || "Vehicle offer";
  const isBuyer = currentUserId === buyerId;

  return {
    id,
    listingId,
    listingTitle,
    listingImage: stringValue(vehicle.coverImage ?? vehicle.coverImageUrl, "/images/easy-ride-hero.svg"),
    buyerId,
    buyerName: isBuyer ? "You" : "Buyer",
    buyerEmail: "",
    buyerPhone: "",
    sellerId,
    sellerName: isBuyer ? "Seller" : "You",
    askingPrice: numberValue(vehicle.salePrice ?? vehicle.price),
    offeredPrice: numberValue(record.amount),
    currency: stringValue(record.currency, "USD").toUpperCase(),
    buyerMessage: stringValue(record.message),
    message: stringValue(record.message),
    status: status as VehicleOffer["status"],
    createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : undefined,
  };
}

async function loadOfferRecords(): Promise<unknown[]> {
  const response = await api.get<unknown>("/offers/me?page=1&pageSize=100");
  if (!Array.isArray(response.data)) {
    throw new ApiError("The offers API returned an invalid response.", "INVALID_RESPONSE", 502);
  }
  return response.data;
}

export async function createVehicleOffer(input: CreateOfferInput): Promise<string> {
  const message = input.message.trim();
  if (input.vehicle.listingType !== "buy") {
    throw new Error("Offers can only be submitted for vehicles listed for sale.");
  }
  if (input.vehicle.status !== "active") {
    throw new Error("This vehicle is no longer available.");
  }
  if (input.buyer.id === input.vehicle.ownerId) {
    throw new Error("You cannot make an offer on your own vehicle.");
  }
  if (!Number.isFinite(input.offeredPrice) || input.offeredPrice <= 0) {
    throw new Error("Enter a valid offer amount.");
  }

  const response = await api.post<unknown>("/offers", {
    vehicleId: input.vehicle.id,
    amount: input.offeredPrice,
    ...(message ? { message } : {}),
  });
  const id = recordId(response.data);
  if (!id) {
    throw new ApiError("The offer response did not include an ID.", "INVALID_RESPONSE", 502);
  }
  return id;
}

export async function getOfferById(offerId: string): Promise<VehicleOffer | null> {
  const offer = (await loadOfferRecords()).find((record) => recordId(record) === offerId);
  return offer ? mapOffer(offer) : null;
}

export async function getUserOffers(userId: string): Promise<VehicleOffer[]> {
  return (await loadOfferRecords())
    .map((record) => mapOffer(record, userId))
    .sort((left, right) => (right.createdAt ?? "").localeCompare(left.createdAt ?? ""));
}

export async function getAllOffers(): Promise<VehicleOffer[]> {
  return unsupported("Administrative offer monitoring is not available in the backend API.");
}

async function patchOfferStatus(offerId: string, status: "accepted" | "rejected" | "withdrawn") {
  await api.patch("/offers/" + encodeURIComponent(offerId) + "/status", { status });
}

export async function acceptOffer(offer: VehicleOffer, currentUserId: string): Promise<void> {
  if (offer.sellerId !== currentUserId) throw new Error("Only the seller can accept this offer.");
  if (offer.status !== "pending") throw new Error("This offer can no longer be accepted.");
  await patchOfferStatus(offer.id, "accepted");
}

export async function rejectOffer(
  offer: VehicleOffer,
  currentUserId: string,
  _message = "",
): Promise<void> {
  if (offer.sellerId !== currentUserId) throw new Error("Only the seller can reject this offer.");
  if (offer.status !== "pending") throw new Error("This offer can no longer be rejected.");
  await patchOfferStatus(offer.id, "rejected");
}

export async function withdrawOffer(offer: VehicleOffer, currentUserId: string): Promise<void> {
  if (offer.buyerId !== currentUserId) throw new Error("Only the buyer can withdraw this offer.");
  if (offer.status !== "pending") throw new Error("This offer can no longer be withdrawn.");
  await patchOfferStatus(offer.id, "withdrawn");
}

export async function counterOffer(
  _offer: VehicleOffer,
  _currentUserId: string,
  _counterPrice: number,
  _message: string,
): Promise<void> {
  unsupported("Counter-offers are not supported by the backend yet.");
}

export async function acceptCounterOffer(
  _offer: VehicleOffer,
  _currentUserId: string,
): Promise<void> {
  unsupported("Counter-offers are not supported by the backend yet.");
}

export async function completeVehicleSale(
  _offerId: string,
  _currentUserId: string,
): Promise<void> {
  unsupported("Sale completion is not supported by the backend yet.");
}

export async function updateOfferStatus(
  offerId: string,
  status: OfferStatus,
): Promise<void> {
  if (status !== "accepted" && status !== "rejected" && status !== "withdrawn") {
    unsupported("This offer status transition is not supported by the backend.");
  }
  await patchOfferStatus(offerId, status);
}
