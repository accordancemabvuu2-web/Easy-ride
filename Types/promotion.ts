export type PromotionPlan = "featured_7_days" | "premium_30_days";

export interface ListingPromotion {
  id: string;
  listingId: string;
  ownerId: string;

  plan: PromotionPlan;

  amount: number;
  currency: string;

  startsAt?: string;
  endsAt?: string;

  active: boolean;
  paymentId: string;

  createdAt?: string;
}
