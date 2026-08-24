export type DisputeStatus = "open" | "investigating" | "resolved" | "closed";

export interface EasyRideDispute {
  id: string;

  bookingId?: string;
  offerId?: string;
  paymentId?: string;

  listingId: string;
  openedById: string;
  openedByName: string;

  reason: string;
  details: string;
  status: DisputeStatus;

  createdAt?: string;
  updatedAt?: string;
}
