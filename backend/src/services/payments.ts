import { HttpError } from "../middleware/errors.js";

export interface CheckoutRequest {
  paymentId: string;
  amount: number;
  currency: string;
  returnUrl?: string;
}

export interface CheckoutResult {
  providerTransactionId: string;
  checkoutUrl: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: CheckoutRequest, idempotencyKey: string): Promise<CheckoutResult>;
  verifyWebhook(rawBody: Buffer, signature: string): Promise<{ eventId: string; paymentId: string; status: "succeeded" | "failed" }>;
}

/** No provider is configured: fail closed rather than creating a fake payment. */
export class UnconfiguredPaymentProvider implements PaymentProvider {
  readonly name = "unconfigured";
  async createCheckout(): Promise<CheckoutResult> {
    throw new HttpError(503, "PAYMENTS_UNAVAILABLE", "No payment provider is configured.");
  }
  async verifyWebhook(): Promise<never> {
    throw new HttpError(503, "PAYMENTS_UNAVAILABLE", "No payment provider is configured.");
  }
}

export const paymentProvider: PaymentProvider = new UnconfiguredPaymentProvider();
