"use client";

import { ApiError, api } from "@/lib/apiClient";
import type { EasyRideReview } from "@/Types/review";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function recordId(value: unknown): string {
  if (typeof value === "string") return value;
  const record = asRecord(value);
  const candidate = record._id ?? record.id;
  return typeof candidate === "string" ? candidate : "";
}

function mapReview(value: unknown, reviewedUserId: string): EasyRideReview {
  const record = asRecord(value);
  const id = recordId(record);
  const reviewerId = recordId(record.reviewerId);
  const listingId = recordId(record.vehicleId);
  if (!id || !reviewerId || !listingId || typeof record.rating !== "number") {
    throw new ApiError("The reviews API returned an invalid record.", "INVALID_RESPONSE", 502);
  }
  return {
    id,
    bookingId: recordId(record.bookingId) || undefined,
    reviewerId,
    reviewerName: "Verified participant",
    reviewedUserId,
    listingId,
    rating: record.rating,
    title: undefined,
    comment: typeof record.comment === "string" ? record.comment : "",
    approved: record.moderationStatus === "approved" || record.moderationStatus === undefined,
    reported: false,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
  };
}

export async function createReview(input: {
  bookingId?: string;
  rating: number;
  comment: string;
}): Promise<void> {
  if (!input.bookingId) {
    throw new ApiError("A completed booking is required to submit a review.", "INELIGIBLE_TRANSACTION", 400);
  }
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new ApiError("Rating must be between 1 and 5.", "VALIDATION_ERROR", 400);
  }
  await api.post("/reviews", {
    bookingId: input.bookingId,
    rating: input.rating,
    comment: input.comment.trim(),
  });
}

export async function getUserReviews(userId: string): Promise<EasyRideReview[]> {
  const response = await api.get<unknown>(
    "/reviews/users/" + encodeURIComponent(userId) + "?page=1&pageSize=100",
  );
  if (!Array.isArray(response.data)) {
    throw new ApiError("The reviews API returned an invalid list.", "INVALID_RESPONSE", 502);
  }
  return response.data.map((record) => mapReview(record, userId));
}

export async function respondToReview(reviewId: string, responseText: string): Promise<void> {
  const response = responseText.trim();
  if (!response) throw new ApiError("Enter a response.", "VALIDATION_ERROR", 400);
  await api.post("/reviews/" + encodeURIComponent(reviewId) + "/response", { response });
}

