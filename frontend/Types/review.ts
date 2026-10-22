export interface EasyRideReview {
  id: string;

  bookingId?: string;
  transactionId?: string;

  reviewerId: string;
  reviewerName: string;

  reviewedUserId: string;
  listingId: string;

  rating: number;
  title: string;
  comment: string;

  approved: boolean;
  reported: boolean;

  createdAt?: string;
}
