export type NotificationType =
  | "message"
  | "offer"
  | "booking"
  | "payment"
  | "listing"
  | "verification"
  | "review"
  | "support"
  | "announcement"
  | "listing_approved"
  | "listing_rejected"
  | "listing_favorited"
  | "listing_reported"
  | "new_message";

export interface EasyRideNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  link?: string;
  icon?: string;
  createdAt?: unknown;
}
