"use client";

import { getBookingById } from "@/services/bookingService";
import { getOfferById } from "@/services/offerService";
import { createNotification } from "@/services/notificationService";
import type { EasyRideReview } from "@/Types/review";
import {
  generateId,
  nowIso,
  readRecords,
  writeRecords,
} from "@/utils/marketplaceStore";

interface CreateReviewInput {
  bookingId?: string;
  transactionId?: string;
  reviewerId: string;
  reviewerName: string;
  reviewedUserId: string;
  listingId: string;
  rating: number;
  title: string;
  comment: string;
}

const STORAGE_KEY = "easy-ride:reviews";

function readReviews() {
  return readRecords<EasyRideReview>(STORAGE_KEY);
}

function writeReviews(reviews: EasyRideReview[]) {
  writeRecords(STORAGE_KEY, reviews, 200);
}

export async function createReview(input: CreateReviewInput) {
  if (input.rating < 1 || input.rating > 5) {
    throw new Error("Rating must be between 1 and 5.");
  }

  const booking = input.bookingId ? await getBookingById(input.bookingId) : null;
  const offer = input.transactionId ? await getOfferById(input.transactionId) : null;

  if (input.bookingId && booking?.status !== "completed") {
    throw new Error("You can only review a completed booking.");
  }

  if (input.transactionId && offer?.status !== "completed") {
    throw new Error("You can only review a completed transaction.");
  }

  const review: EasyRideReview = {
    id: generateId(),
    ...input,
    approved: true,
    reported: false,
    createdAt: nowIso(),
  };

  writeReviews([review, ...readReviews()]);

  await createNotification({
    userId: input.reviewedUserId,
    type: "review",
    title: "New Review",
    message: "Someone reviewed your vehicle.",
    actionUrl: `/vehicle/${input.listingId}`,
    link: `/vehicle/${input.listingId}`,
  });
}

export function getUserReviews(userId: string) {
  return readReviews()
    .filter((review) => review.reviewedUserId === userId && review.approved)
    .sort((left, right) => (right.createdAt ?? "").localeCompare(left.createdAt ?? ""));
}
