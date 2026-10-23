export type BookingStatus =
  | "pending"
  | "rejected"
  | "awaiting_payment"
  | "confirmed"
  | "cancelled"
  | "active"
  | "completed"
  | "disputed";

export type BookingPaymentStatus =
  | "not_required"
  | "pending"
  | "paid"
  | "failed"
  | "refunded";

export interface RentalBooking {
  id: string;

  listingId: string;
  listingTitle: string;
  listingImage: string;

  renterId: string;
  renterName: string;
  renterEmail: string;
  renterPhone: string;

  ownerId: string;
  ownerName: string;

  pickupDate: string;
  returnDate: string;
  totalDays: number;

  dailyRate: number;
  subtotal: number;
  serviceFee: number;
  deposit: number;
  totalAmount: number;
  currency: string;

  status: BookingStatus;

  renterMessage: string;
  ownerResponse?: string;
  rejectionReason?: string;
  cancellationReason?: string;

  paymentStatus: BookingPaymentStatus;
  paymentId?: string;

  createdAt?: string;
  updatedAt?: string;
}
