import type { PromotionPlan } from "@/Types/promotion";

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
