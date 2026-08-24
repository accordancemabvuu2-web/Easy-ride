export type OfferStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "countered"
  | "withdrawn"
  | "completed";

export interface VehicleOffer {
  id: string;

  listingId: string;
  listingTitle: string;
  listingImage: string;

  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;

  sellerId: string;
  sellerName: string;

  askingPrice: number;
  offeredPrice: number;
  counterPrice?: number;
  currency: string;

  buyerMessage: string;
  message?: string;
  sellerMessage?: string;

  status: OfferStatus;

  createdAt?: string;
  updatedAt?: string;
}
