"use client";

import { getListingById } from "@/services/listingService";
import type { ListingPromotion, PromotionPlan } from "@/Types/promotion";
import {
  generateId,
  nowIso,
  readRecords,
  upsertRecord,
  writeRecords,
} from "@/utils/marketplaceStore";

interface CreatePromotionInput {
  listingId: string;
  ownerId: string;
  plan: PromotionPlan;
  currency: string;
}

const STORAGE_KEY = "easy-ride:promotions";

export const promotionPlans: Array<{
  id: PromotionPlan;
  label: string;
  amount: number;
  durationDays: number;
  description: string;
}> = [
  {
    id: "featured_7_days",
    label: "Featured",
    amount: 250,
    durationDays: 7,
    description: "Featured badge, priority placement for 7 days.",
  },
  {
    id: "premium_30_days",
    label: "Premium",
    amount: 650,
    durationDays: 30,
    description: "Homepage placement, search priority and a highlighted card.",
  },
];

function readPromotions() {
  return readRecords<ListingPromotion>(STORAGE_KEY);
}

function writePromotions(promotions: ListingPromotion[]) {
  writeRecords(STORAGE_KEY, promotions, 100);
}

export function getPromotions() {
  return readPromotions().sort((left, right) =>
    (right.createdAt ?? "").localeCompare(left.createdAt ?? ""),
  );
}

export function getPromotionByListingId(listingId: string) {
  return readPromotions().find((promotion) => promotion.listingId === listingId) ?? null;
}

export async function createPromotion(input: CreatePromotionInput) {
  const listing = await getListingById(input.listingId);
  if (!listing) {
    throw new Error("Listing not found.");
  }

  if (listing.ownerId !== input.ownerId) {
    throw new Error("You cannot promote another person's listing.");
  }

  const selectedPlan = promotionPlans.find((plan) => plan.id === input.plan);
  if (!selectedPlan) {
    throw new Error("Invalid promotion plan.");
  }

  const promotion: ListingPromotion = {
    id: generateId(),
    listingId: input.listingId,
    ownerId: input.ownerId,
    plan: input.plan,
    amount: selectedPlan.amount,
    currency: input.currency,
    active: false,
    paymentId: "",
    createdAt: nowIso(),
  };

  writePromotions(upsertRecord(readPromotions(), promotion));
  return promotion;
}

export function activatePromotion(promotionId: string, paymentId?: string) {
  const promotions = readPromotions();
  const promotion = promotions.find((item) => item.id === promotionId);

  if (!promotion) {
    throw new Error("Promotion not found.");
  }

  const selectedPlan = promotionPlans.find((plan) => plan.id === promotion.plan);
  const startsAt = nowIso();
  const endsAt = new Date(
    Date.now() + (selectedPlan?.durationDays ?? 7) * 24 * 60 * 60 * 1000,
  ).toISOString();

  const nextPromotion: ListingPromotion = {
    ...promotion,
    active: true,
    paymentId: paymentId ?? promotion.paymentId,
    startsAt,
    endsAt,
  };

  writePromotions(upsertRecord(promotions.filter((item) => item.id !== promotionId), nextPromotion));

}
