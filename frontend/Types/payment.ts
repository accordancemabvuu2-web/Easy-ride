export type PaymentStatus =
  | "pending"
  | "processing"
  | "successful"
  | "failed"
  | "cancelled"
  | "refunded";

export type PaymentPurpose =
  | "rental_booking"
  | "listing_promotion"
  | "dealer_subscription";

export interface EasyRidePayment {
  id: string;

  userId: string;
  purpose: PaymentPurpose;

  referenceId: string;
  provider: "mock";
  providerReference?: string;

  amount: number;
  currency: string;

  status: PaymentStatus;

  failureReason?: string;

  createdAt?: unknown;
  updatedAt?: unknown;
}
